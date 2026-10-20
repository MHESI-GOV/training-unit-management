"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { hashNationalId } from "@/lib/crypto/national-id";
import { ASSESSMENT_STANDARD_LABEL, ASSESSMENT_RESULT_LABEL } from "@/lib/labels";
import type { Database } from "@/lib/supabase/database.types";

type AssessmentStandard = Database["public"]["Enums"]["assessment_standard"];
type AssessmentResultValue = Database["public"]["Enums"]["assessment_result_enum"];

export type PreviewRow = {
  rowNumber: number;
  national_id: string;
  learner_id?: string;
  learner_name?: string;
  standard_type: string;
  result: string;
  tested_at: string;
  evidence_ref: string;
  status: "pass" | "fail";
  reason?: string;
};

export type PreviewState = {
  error?: string;
  fileName?: string;
  rows?: PreviewRow[];
  passCount?: number;
  failCount?: number;
};

const NATIONAL_ID_RE = /^\d{13}$/;
const VALID_STANDARDS = new Set(Object.keys(ASSESSMENT_STANDARD_LABEL));
const VALID_RESULTS = new Set(Object.keys(ASSESSMENT_RESULT_LABEL));

export async function previewAssessmentImport(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "กรุณาเลือกไฟล์ CSV" };
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    return { error: `อ่านไฟล์ไม่สำเร็จ: ${parsed.errors[0].message}` };
  }

  const supabase = await createClient();
  const rows: PreviewRow[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const r = parsed.data[i];
    const rowNumber = i + 2;
    const nationalId = (r.national_id ?? "").trim();
    const standardType = (r.standard_type ?? "").trim();
    const result = (r.result ?? "").trim();
    const testedAt = (r.tested_at ?? "").trim();
    const evidenceRef = (r.evidence_ref ?? "").trim();

    let status: "pass" | "fail" = "pass";
    let reason: string | undefined;
    let learnerId: string | undefined;
    let learnerName: string | undefined;

    if (!NATIONAL_ID_RE.test(nationalId)) {
      status = "fail";
      reason = "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก";
    } else if (!VALID_STANDARDS.has(standardType)) {
      status = "fail";
      reason = "มาตรฐานไม่ถูกต้อง";
    } else if (!VALID_RESULTS.has(result)) {
      status = "fail";
      reason = "ผลการทดสอบไม่ถูกต้อง (ต้องเป็น passed/failed/pending)";
    } else {
      const { data: learner } = await supabase
        .from("learners")
        .select("learner_id, first_name, last_name")
        .eq("national_id_hash", hashNationalId(nationalId))
        .eq("unit_id", unitId)
        .maybeSingle();
      if (!learner) {
        status = "fail";
        reason = "ไม่พบผู้เรียนนี้ในหน่วย (เลขบัตรประชาชนไม่ตรงกับผู้เรียนในหน่วยนี้)";
      } else {
        learnerId = learner.learner_id;
        learnerName = `${learner.first_name} ${learner.last_name}`;
      }
    }

    rows.push({
      rowNumber,
      national_id: nationalId,
      learner_id: learnerId,
      learner_name: learnerName,
      standard_type: standardType,
      result,
      tested_at: testedAt,
      evidence_ref: evidenceRef,
      status,
      reason,
    });
  }

  return {
    fileName: file.name,
    rows,
    passCount: rows.filter((r) => r.status === "pass").length,
    failCount: rows.filter((r) => r.status === "fail").length,
  };
}

export type CommitState = { error?: string; created?: number };

export async function commitAssessmentImport(
  _prev: CommitState,
  formData: FormData,
): Promise<CommitState> {
  const { unitId, profile } = await resolveActionUnit(formData.get("unit_id")?.toString());

  const rowsJson = String(formData.get("rows") ?? "[]");
  const rows: PreviewRow[] = JSON.parse(rowsJson).filter(
    (r: PreviewRow) => r.status === "pass" && r.learner_id,
  );

  if (rows.length === 0) return { error: "ไม่มีแถวที่ผ่านการตรวจสอบให้นำเข้า" };

  const supabase = await createClient();
  let created = 0;

  for (const row of rows) {
    // Re-verify the learner still belongs to this unit at commit time -- the preview result
    // is just a snapshot, same defense-in-depth pattern as the learner CSV import (M8).
    const { data: learner } = await supabase
      .from("learners")
      .select("learner_id")
      .eq("learner_id", row.learner_id!)
      .eq("unit_id", unitId)
      .maybeSingle();
    if (!learner) continue;

    const { error } = await supabase.from("assessment_results").insert({
      learner_id: learner.learner_id,
      standard_type: row.standard_type as AssessmentStandard,
      result: row.result as AssessmentResultValue,
      tested_at: row.tested_at || null,
      evidence_ref: row.evidence_ref || null,
      confirmed_by: profile.id,
    });
    if (!error) created++;
  }

  revalidatePath("/unit/learners");
  revalidatePath("/unit/import-assessments");
  return { created };
}
