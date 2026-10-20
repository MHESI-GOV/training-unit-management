"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { encryptNationalId, hashNationalId, bufferToByteaHex } from "@/lib/crypto/national-id";

async function requireOwnUnitId(): Promise<string> {
  const profile = await requireProfile();
  if (profile.role !== "unit_coordinator" || !profile.unit_scope) {
    throw new Error("บัญชีนี้ไม่มีหน่วยฝึกอบรมที่จัดการได้");
  }
  return profile.unit_scope;
}

export type PreviewRow = {
  rowNumber: number;
  first_name: string;
  last_name: string;
  national_id: string;
  phone: string;
  email: string;
  address: string;
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

export async function previewImport(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  await requireOwnUnitId();

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
  const seenInFile = new Set<string>();
  const rows: PreviewRow[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const r = parsed.data[i];
    const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
    const first_name = (r.first_name ?? "").trim();
    const last_name = (r.last_name ?? "").trim();
    const national_id = (r.national_id ?? "").trim();
    const phone = (r.phone ?? "").trim();
    const email = (r.email ?? "").trim();
    const address = (r.address ?? "").trim();

    let status: "pass" | "fail" = "pass";
    let reason: string | undefined;

    if (!first_name || !last_name) {
      status = "fail";
      reason = "ขาดชื่อหรือนามสกุล";
    } else if (!NATIONAL_ID_RE.test(national_id)) {
      status = "fail";
      reason = "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก";
    } else if (seenInFile.has(national_id)) {
      status = "fail";
      reason = "เลขบัตรประชาชนซ้ำภายในไฟล์เดียวกัน";
    } else {
      const hash = hashNationalId(national_id);
      const { data: existing } = await supabase
        .from("learners")
        .select("learner_id")
        .eq("national_id_hash", hash)
        .maybeSingle();
      if (existing) {
        status = "fail";
        reason = "มีเลขบัตรประชาชนนี้ในระบบแล้ว (อาจอยู่หน่วยอื่น)";
      }
    }

    if (status === "pass") seenInFile.add(national_id);

    rows.push({ rowNumber, first_name, last_name, national_id, phone, email, address, status, reason });
  }

  return {
    fileName: file.name,
    rows,
    passCount: rows.filter((r) => r.status === "pass").length,
    failCount: rows.filter((r) => r.status === "fail").length,
  };
}

export type CommitState = { error?: string; created?: number; enrolled?: number; blocked?: number };

export async function commitImport(
  _prev: CommitState,
  formData: FormData,
): Promise<CommitState> {
  const unitId = await requireOwnUnitId();
  const profile = await requireProfile();

  const fileName = String(formData.get("file_name") ?? "import.csv");
  const classId = String(formData.get("class_id") ?? "") || null;
  const rowsJson = String(formData.get("rows") ?? "[]");
  const rows: PreviewRow[] = JSON.parse(rowsJson).filter((r: PreviewRow) => r.status === "pass");

  if (rows.length === 0) return { error: "ไม่มีแถวที่ผ่านการตรวจสอบให้นำเข้า" };

  const supabase = await createClient();

  const { data: job, error: jobErr } = await supabase
    .from("import_jobs")
    .insert({
      uploaded_by: profile.id,
      file_name: fileName,
      total_rows: rows.length,
      status: "processing",
      approved_by: profile.id, // self-approve, per §09 matrix "Unit Coordinator self-approve"
      approved_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (jobErr || !job) return { error: `สร้างงานนำเข้าไม่สำเร็จ: ${jobErr?.message}` };

  let created = 0;
  let enrolled = 0;
  let blocked = 0;

  for (const row of rows) {
    const { data: learner, error: learnerErr } = await supabase
      .from("learners")
      .insert({
        first_name: row.first_name,
        last_name: row.last_name,
        national_id_encrypted: bufferToByteaHex(encryptNationalId(row.national_id)),
        national_id_hash: hashNationalId(row.national_id),
        phone: row.phone || null,
        email: row.email || null,
        address: row.address || null,
        source: "unit_import_file",
        created_by: profile.id,
        unit_id: unitId,
      })
      .select()
      .single();

    if (learnerErr || !learner) {
      await supabase.from("import_errors").insert({
        job_id: job.job_id,
        row_number: row.rowNumber,
        column_name: "national_id",
        reason: learnerErr?.message ?? "insert failed",
      });
      continue;
    }
    created++;

    if (classId) {
      const { error: enrollErr } = await supabase
        .from("enrollments")
        .insert({ learner_id: learner.learner_id, class_id: classId });
      if (enrollErr) {
        blocked++;
        await supabase.from("import_errors").insert({
          job_id: job.job_id,
          row_number: row.rowNumber,
          column_name: "enrollment",
          reason: enrollErr.message,
        });
      } else {
        enrolled++;
      }
    }
  }

  await supabase
    .from("import_jobs")
    .update({ passed_rows: created, failed_rows: rows.length - created, status: "completed" })
    .eq("job_id", job.job_id);

  revalidatePath("/unit/import");
  revalidatePath("/unit/learners");
  return { created, enrolled, blocked };
}
