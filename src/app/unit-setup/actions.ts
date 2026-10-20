"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { UNIT_TYPE_LABEL, REGION_LABEL } from "@/lib/labels";
import type { Database } from "@/lib/supabase/database.types";

export type SubmitUnitState = {
  error?: string;
};

type UnitType = Database["public"]["Enums"]["unit_type"];
type RegionType = Database["public"]["Enums"]["region_type"];

function clean(formData: FormData, key: string): string | null {
  return String(formData.get(key) ?? "").trim() || null;
}

export async function submitTrainingUnit(
  _prevState: SubmitUnitState,
  formData: FormData,
): Promise<SubmitUnitState> {
  const profile = await requireProfile();

  // Mirrors the DB-level check inside submit_training_unit() (§09 enforcement #12) so the
  // user gets a readable error instead of a raw Postgres exception when this is stale/misused.
  if (profile.role !== "unit_coordinator" || profile.unit_scope) {
    return { error: "บัญชีนี้ไม่สามารถสร้างหน่วยฝึกอบรมได้" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const region = String(formData.get("region") ?? "");
  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();

  // Only ชื่อสถาบัน (+ the structural type/region the schema needs) is required; everything else,
  // including the map pin, can be filled in later from the unit-profile menu.
  if (!name || !(type in UNIT_TYPE_LABEL) || !(region in REGION_LABEL)) {
    return { error: "กรุณากรอกชื่อสถาบัน ประเภทหน่วย และภูมิภาค" };
  }

  const latitude = latRaw ? Number(latRaw) : NaN;
  const longitude = lngRaw ? Number(lngRaw) : NaN;
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  const supabase = await createClient();
  const { data: unitId, error } = await supabase.rpc("submit_training_unit", {
    p_name: name,
    p_type: type as UnitType,
    p_region: region as RegionType,
    p_latitude: hasCoords ? latitude : undefined,
    p_longitude: hasCoords ? longitude : undefined,
  });

  if (error) {
    return { error: `บันทึกไม่สำเร็จ: ${error.message}` };
  }

  // Persist the rest of the onboarding profile onto the row the RPC just created (or create it, if
  // no pin was dropped so the RPC made none). Best-effort: the unit already exists and is usable;
  // any field here can be re-entered from /unit/profile, so a failure here shouldn't strand the
  // coordinator on a form they can no longer resubmit.
  if (unitId) {
    const first = clean(formData, "coordinator_first_name");
    const last = clean(formData, "coordinator_last_name");
    const combined = [first, last].filter(Boolean).join(" ") || null;
    const tc = String(formData.get("is_food_testing_center") ?? "");

    await supabase.from("training_unit_profiles").upsert({
      unit_id: unitId,
      house_no: clean(formData, "house_no"),
      road: clean(formData, "road"),
      province_name: clean(formData, "province_name"),
      district_name: clean(formData, "district_name"),
      subdistrict_name: clean(formData, "subdistrict_name"),
      coordinator_first_name: first,
      coordinator_last_name: last,
      coordinator_name: combined,
      phone: clean(formData, "phone"),
      email: clean(formData, "email"),
      is_food_testing_center: tc === "true" ? true : tc === "false" ? false : null,
      latitude: hasCoords ? latitude : null,
      longitude: hasCoords ? longitude : null,
    });
  }

  redirect("/");
}
