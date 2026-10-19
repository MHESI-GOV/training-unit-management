"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";

export type SubmitUnitState = {
  error?: string;
};

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

  if (!name || !type || !region) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_training_unit", {
    p_name: name,
    p_type: type,
    p_region: region,
    p_external_ref: externalRef,
  });

  if (error) {
    return { error: `บันทึกไม่สำเร็จ: ${error.message}` };
  }

  redirect("/");
}
