"use server";

import { revalidatePath } from "next/cache";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { readUploadedRows } from "@/lib/import-file";
import { encryptNationalId, hashNationalId, bufferToByteaHex } from "@/lib/crypto/national-id";

export type PreviewRow = {
  rowNumber: number;
  first_name: string;
  last_name: string;
  national_id: string;
  birth_date: string;
  gender: string;
  occupation: string;
  phone: string;
  email: string;
  address: string;
  status: "pass" | "fail";
  reason?: string;
};

function parseGender(v: string): "male" | "female" | null {
  const s = v.trim().toLowerCase();
  if (s === "male" || s === "ชาย") return "male";
  if (s === "female" || s === "หญิง") return "female";
  return null;
}

export type PreviewState = {
  error?: string;
  fileName?: string;
  rows?: PreviewRow[];
  passCount?: number;
  failCount?: number;
};

const NATIONAL_ID_RE = /^\d{13}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function previewImport(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  await resolveActionUnit(formData.get("unit_id")?.toString());

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "กรุณาเลือกไฟล์ CSV หรือ Excel (.xlsx)" };
  }

  const { rows: data, error: readErr } = await readUploadedRows(file);
  if (readErr || !data) return { error: readErr ?? "อ่านไฟล์ไม่สำเร็จ" };

  const supabase = await createClient();
  const seenInFile = new Set<string>();
  const rows: PreviewRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
    const first_name = (r.first_name ?? "").trim();
    const last_name = (r.last_name ?? "").trim();
    const national_id = (r.national_id ?? "").trim();
    const birth_date = (r.birth_date ?? "").trim();
    const gender = (r.gender ?? "").trim();
    const occupation = (r.occupation ?? "").trim();
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
    } else if (birth_date && !DATE_RE.test(birth_date)) {
      status = "fail";
      reason = "วันเกิดต้องอยู่ในรูปแบบ ปปปป-ดด-วว (ค.ศ.)";
    } else if (gender && !parseGender(gender)) {
      status = "fail";
      reason = "เพศต้องเป็น male/female หรือ ชาย/หญิง";
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

    rows.push({ rowNumber, first_name, last_name, national_id, birth_date, gender, occupation, phone, email, address, status, reason });
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
  const { unitId, profile } = await resolveActionUnit(formData.get("unit_id")?.toString());

  const fileName = String(formData.get("file_name") ?? "import.csv");
  const classId = String(formData.get("class_id") ?? "").trim();
  const rowsJson = String(formData.get("rows") ?? "[]");
  const rows: PreviewRow[] = JSON.parse(rowsJson).filter((r: PreviewRow) => r.status === "pass");

  if (rows.length === 0) return { error: "ไม่มีแถวที่ผ่านการตรวจสอบให้นำเข้า" };
  if (!classId) return { error: "กรุณาเลือกรุ่นฝึกอบรมที่จะบันทึกผู้เรียนลงไป" };

  const supabase = await createClient();

  // Confirm the target class belongs to this unit before inserting anything.
  const { data: cls } = await supabase
    .from("classes")
    .select("class_id")
    .eq("class_id", classId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!cls) return { error: "ไม่พบรุ่นฝึกอบรมนี้ในหน่วยของคุณ" };

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
        birth_date: row.birth_date || null,
        gender: parseGender(row.gender),
        occupation: row.occupation || null,
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
