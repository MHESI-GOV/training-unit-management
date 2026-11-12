"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaffProfile } from "@/lib/auth/resolve-unit";
import { requireWebMaster } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeUnitParticipation } from "@/lib/participation";
import { UNIT_TYPE_LABEL, REGION_LABEL } from "@/lib/labels";
import { regionFromProvince } from "@/lib/id-codes";
import type { Database } from "@/lib/supabase/database.types";

export type CreateUnitState = { error?: string };

type UnitType = Database["public"]["Enums"]["unit_type"];
type RegionType = Database["public"]["Enums"]["region_type"];

// Round 12: Web Master / Central Staff create a unit directly (no coordinator yet), then fill the
// rest of its data on the per-unit data-sheet. Creation goes through the create_training_unit_as_staff
// SECURITY DEFINER RPC (training_units has no INSERT RLS policy). Unlike submit_training_unit(), it
// never touches the caller's unit_scope — staff keep their cross-unit role.
export async function createTrainingUnitAsStaff(
  _prev: CreateUnitState,
  formData: FormData,
): Promise<CreateUnitState> {
  await requireStaffProfile();

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const provinceName = String(formData.get("province_name") ?? "").trim() || null;
  const region = String(formData.get("region") ?? "") || regionFromProvince(provinceName) || "";
  const externalRef = String(formData.get("external_ref") ?? "").trim() || null;

  if (!name || !(type in UNIT_TYPE_LABEL) || !(region in REGION_LABEL)) {
    return { error: "กรุณากรอกชื่อสถาบัน ประเภทหน่วย และภูมิภาค" };
  }

  const supabase = await createClient();
  const { data: unitId, error } = await supabase.rpc("create_training_unit_as_staff", {
    p_name: name,
    p_type: type as UnitType,
    p_region: region as RegionType,
    p_external_ref: externalRef ?? undefined,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `มีหน่วยฝึกชื่อ "${name}" อยู่แล้วในระบบ` };
    }
    return { error: `สร้างหน่วยฝึกไม่สำเร็จ: ${error.message}` };
  }

  // Keep the province the region was filled from, so the unit code and profile match it.
  if (provinceName) {
    await supabase.from("training_unit_profiles").upsert({ unit_id: unitId, province_name: provinceName });
  }

  // Land on the data-sheet's profile tab so staff can fill address/coordinator/photos next.
  redirect(`/admin/units/${unitId}/profile`);
}

// Round 12: record a unit's participation for a fiscal year RETROACTIVELY (WM-only). Needed for
// the ~72 units that already operated — the class-creation gate requires a confirmed participation,
// but confirming is normally coordinator-only on an open round. This writes directly via the admin
// client: it reuses the round for that FY if one exists, otherwise creates a CLOSED round (so it
// does NOT pop the confirm prompt for every other coordinator), then marks THIS unit confirmed.
export type ConfirmParticipationState = { error?: string; success?: string };

export async function adminConfirmParticipation(
  _prev: ConfirmParticipationState,
  formData: FormData,
): Promise<ConfirmParticipationState> {
  const wm = await requireWebMaster();
  const unitId = String(formData.get("unit_id") ?? "").trim();
  const fiscalYear = Number(formData.get("fiscal_year"));
  if (!unitId) return { error: "ไม่พบหน่วยฝึก" };
  if (!Number.isInteger(fiscalYear) || fiscalYear < 2500 || fiscalYear > 2700) {
    return { error: "กรุณาระบุปีงบประมาณ (พ.ศ.) ให้ถูกต้อง" };
  }

  const admin = createAdminClient();

  // Find or create the round for this fiscal year.
  const { data: existing } = await admin
    .from("participation_rounds")
    .select("round_id")
    .eq("fiscal_year", fiscalYear)
    .maybeSingle();

  let roundId = existing?.round_id;
  if (!roundId) {
    const { data: created, error: roundErr } = await admin
      .from("participation_rounds")
      .insert({ fiscal_year: fiscalYear, status: "closed", opened_by: wm.id })
      .select("round_id")
      .single();
    if (roundErr || !created) {
      return { error: `สร้างรอบปีงบไม่สำเร็จ: ${roundErr?.message ?? "unknown"}` };
    }
    roundId = created.round_id;
  }

  // Upsert this unit's row to confirmed.
  const { error: upErr } = await admin
    .from("unit_participation")
    .upsert(
      {
        round_id: roundId,
        unit_id: unitId,
        fiscal_year: fiscalYear,
        status: "confirmed",
        responded_by: wm.id,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "round_id,unit_id" },
    );
  if (upErr) return { error: `บันทึกการเข้าร่วมไม่สำเร็จ: ${upErr.message}` };

  await admin.from("audit_log").insert({
    actor_user_id: wm.id,
    action: "admin_confirm_participation",
    entity_type: "unit_participation",
    record_id: `${roundId}:${unitId}`,
    changed_fields: [String(fiscalYear)],
  });

  revalidatePath(`/admin/units/${unitId}`);
  return { success: `บันทึกการเข้าร่วมปีงบประมาณ ${fiscalYear} แล้ว` };
}

// Staff correction for a participation year recorded by mistake. Blocked while classes are bound
// to that unit + year: removing the row would drop their learners out of that year's dashboard figures.
export async function adminDeleteParticipation(
  _prev: ConfirmParticipationState,
  formData: FormData,
): Promise<ConfirmParticipationState> {
  const staff = await requireStaffProfile();
  const unitId = String(formData.get("unit_id") ?? "").trim();
  const fiscalYear = Number(formData.get("fiscal_year"));
  if (!unitId || !Number.isInteger(fiscalYear)) return { error: "ไม่พบรายการที่จะลบ" };

  const admin = createAdminClient();

  const { count: classCount, error: classErr } = await admin
    .from("classes")
    .select("class_id", { count: "exact", head: true })
    .eq("unit_id", unitId)
    .eq("fiscal_year", fiscalYear);
  if (classErr) return { error: `ตรวจสอบรุ่นฝึกอบรมไม่สำเร็จ: ${classErr.message}` };
  if (classCount) {
    return { error: `ลบปีงบ ${fiscalYear} ไม่ได้ เพราะมี ${classCount} ชั้นเรียนผูกกับปีงบนี้อยู่ แก้ปีงบได้ที่ปุ่มแก้ไขชั้นเรียนของแต่ละชั้นเรียน` };
  }

  const { removed, error: delErr } = await removeUnitParticipation(admin, unitId, fiscalYear, staff.id, "admin_delete_participation");
  if (delErr) return { error: `ลบการเข้าร่วมไม่สำเร็จ: ${delErr}` };
  if (!removed) return { error: "ไม่พบรายการเข้าร่วมของปีงบนี้" };

  revalidatePath(`/admin/units/${unitId}`, "layout");
  revalidatePath("/admin/participation");
  return { success: `ลบการเข้าร่วมปีงบประมาณ ${fiscalYear} แล้ว` };
}
