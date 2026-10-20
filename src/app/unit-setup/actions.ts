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
  const externalRef = String(formData.get("external_ref") ?? "").trim() || null;
  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();
  const provinceName = String(formData.get("province_name") ?? "").trim() || null;

  if (!name || !(type in UNIT_TYPE_LABEL) || !(region in REGION_LABEL)) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  const latitude = latRaw ? Number(latRaw) : NaN;
  const longitude = lngRaw ? Number(lngRaw) : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { error: "กรุณาปักหมุดตำแหน่งที่ตั้งหน่วยฝึกอบรมบนแผนที่" };
  }

  const supabase = await createClient();
  const { data: unitId, error } = await supabase.rpc("submit_training_unit", {
    p_name: name,
    p_type: type as UnitType,
    p_region: region as RegionType,
    p_external_ref: externalRef ?? undefined,
    p_latitude: latitude,
    p_longitude: longitude,
  });

  if (error) {
    return { error: `บันทึกไม่สำเร็จ: ${error.message}` };
  }

  // Store the reverse-geocoded province name on the profile row the RPC just created. Best-effort:
  // the unit is already created and usable; the province only feeds the dashboard map's filter.
  if (unitId && provinceName) {
    await supabase.from("training_unit_profiles").update({ province_name: provinceName }).eq("unit_id", unitId);
  }

  redirect("/");
}
