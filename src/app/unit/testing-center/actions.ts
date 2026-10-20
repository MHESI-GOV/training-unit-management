"use server";

import { revalidatePath } from "next/cache";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type AssessmentStandard = Database["public"]["Enums"]["assessment_standard"];
type TestingCenterStatusValue = Database["public"]["Enums"]["testing_center_status_enum"];

export type TestingCenterFormState = { error?: string };

export async function upsertTestingCenterStatus(
  _prev: TestingCenterFormState,
  formData: FormData,
): Promise<TestingCenterFormState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());

  const standardType = String(formData.get("standard_type") ?? "") as AssessmentStandard;
  const status = String(formData.get("status") ?? "") as TestingCenterStatusValue;
  const evidenceRef = String(formData.get("evidence_ref") ?? "").trim() || null;

  if (!standardType || !status) return { error: "กรุณาเลือกมาตรฐานและสถานะ" };

  const supabase = await createClient();
  const { error } = await supabase.from("testing_center_statuses").upsert({
    unit_id: unitId,
    standard_type: standardType,
    status,
    evidence_ref: evidenceRef,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/unit/testing-center");
  return {};
}
