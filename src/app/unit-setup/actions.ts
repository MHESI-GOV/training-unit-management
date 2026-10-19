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

  if (!name || !(type in UNIT_TYPE_LABEL) || !(region in REGION_LABEL)) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_training_unit", {
    p_name: name,
    p_type: type as UnitType,
    p_region: region as RegionType,
    p_external_ref: externalRef ?? undefined,
  });

  if (error) {
    return { error: `บันทึกไม่สำเร็จ: ${error.message}` };
  }

  redirect("/");
}
