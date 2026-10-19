"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type AssessmentStandard = Database["public"]["Enums"]["assessment_standard"];
type TestingCenterStatusValue = Database["public"]["Enums"]["testing_center_status_enum"];

export type TestingCenterFormState = { error?: string };

export async function upsertTestingCenterStatus(
  _prev: TestingCenterFormState,
  formData: FormData,
): Promise<TestingCenterFormState> {
  const profile = await requireProfile();
  if (profile.role !== "unit_coordinator" || !profile.unit_scope) {
    return { error: "บัญชีนี้ไม่มีหน่วยฝึกอบรมที่จัดการได้" };
  }

  const standardType = String(formData.get("standard_type") ?? "") as AssessmentStandard;
  const status = String(formData.get("status") ?? "") as TestingCenterStatusValue;
  const evidenceRef = String(formData.get("evidence_ref") ?? "").trim() || null;

  if (!standardType || !status) return { error: "กรุณาเลือกมาตรฐานและสถานะ" };

  const supabase = await createClient();
  const { error } = await supabase.from("testing_center_statuses").upsert({
    unit_id: profile.unit_scope,
    standard_type: standardType,
    status,
    evidence_ref: evidenceRef,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/unit/testing-center");
  return {};
}
