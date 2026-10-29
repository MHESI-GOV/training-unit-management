"use server";

import { revalidatePath } from "next/cache";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { readUploadedRows } from "@/lib/import-file";
import { getUnitConfirmedRounds } from "@/lib/participation";

export type PreviewRow = {
  rowNumber: number;
  course_name: string;
  course_id?: string;
  name: string;
  start_date: string;
  end_date: string;
  schedule_time: string;
  seat_count: string;
  mode: string;
  location: string;
  note: string;
  external_ref: string;
  status: "pass" | "fail";
  reason?: string;
};

const MODES = ["onsite", "online", "hybrid"];

export type PreviewState = {
  error?: string;
  fileName?: string;
  rows?: PreviewRow[];
  passCount?: number;
  failCount?: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function previewClassImport(
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
  const { data: courses } = await supabase.from("courses").select("course_id, name");
  const courseByName = new Map((courses ?? []).map((c) => [c.name.trim(), c.course_id]));

  const rows: PreviewRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const rowNumber = i + 2;
    const courseName = (r.course_name ?? "").trim();
    const name = (r.name ?? "").trim();
    const startDate = (r.start_date ?? "").trim();
    const endDate = (r.end_date ?? "").trim();
    const scheduleTime = (r.schedule_time ?? "").trim();
    const seatCountRaw = (r.seat_count ?? "").trim();
    const mode = (r.mode ?? "").trim().toLowerCase();
    const location = (r.location ?? "").trim();
    const note = (r.note ?? "").trim();
    const externalRef = (r.external_ref ?? "").trim();
    const seatCount = Number(seatCountRaw);

    let status: "pass" | "fail" = "pass";
    let reason: string | undefined;
    let courseId: string | undefined;

    if (!courseByName.has(courseName)) {
      status = "fail";
      reason = "ไม่พบหลักสูตรนี้ — สร้างที่หน้าหลักสูตรก่อน";
    } else if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      status = "fail";
      reason = "รูปแบบวันที่ต้องเป็น YYYY-MM-DD (ค.ศ.)";
    } else if (startDate > endDate) {
      status = "fail";
      reason = "วันเริ่มต้องไม่มากกว่าวันสิ้นสุด";
    } else if (!Number.isFinite(seatCount) || seatCount <= 0) {
      status = "fail";
      reason = "จำนวนที่นั่งต้องเป็นเลขจำนวนเต็มบวก";
    } else if (mode && !MODES.includes(mode)) {
      status = "fail";
      reason = "รูปแบบการเรียนต้องเป็น onsite / online / hybrid";
    } else {
      courseId = courseByName.get(courseName);
    }

    rows.push({
      rowNumber,
      course_name: courseName,
      course_id: courseId,
      name,
      start_date: startDate,
      end_date: endDate,
      schedule_time: scheduleTime,
      seat_count: seatCountRaw,
      mode,
      location,
      note,
      external_ref: externalRef,
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

export async function commitClassImport(
  _prev: CommitState,
  formData: FormData,
): Promise<CommitState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());

  const rowsJson = String(formData.get("rows") ?? "[]");
  const rows: PreviewRow[] = JSON.parse(rowsJson).filter(
    (r: PreviewRow) => r.status === "pass" && r.course_id,
  );
  if (rows.length === 0) return { error: "ไม่มีแถวที่ผ่านการตรวจสอบให้นำเข้า" };

  const supabase = await createClient();

  // Gate: the unit must have confirmed participation; bind every imported class to the latest such year.
  const confirmed = await getUnitConfirmedRounds(supabase, unitId);
  if (confirmed.length === 0) {
    return { error: "หน่วยนี้ยังไม่ได้ยืนยันเข้าร่วมปีงบประมาณใด — ต้องยืนยันการเข้าร่วมก่อนจึงจะนำเข้าชั้นเรียนได้" };
  }
  const target = confirmed[0];
  let created = 0;

  // Compute the next per-unit batch number once, then increment locally per inserted row
  // (batch_code is unique per unit and required by the class-detail/management model).
  const { data: existing } = await supabase.from("classes").select("batch_code").eq("unit_id", unitId);
  let seq = 0;
  for (const e of existing ?? []) {
    const m = /^R(\d+)$/.exec(e.batch_code ?? "");
    if (m) seq = Math.max(seq, Number(m[1]));
  }

  for (const row of rows) {
    seq += 1;
    const { error } = await supabase.from("classes").insert({
      course_id: row.course_id!,
      unit_id: unitId,
      batch_code: `R${String(seq).padStart(3, "0")}`,
      name: row.name || null,
      start_date: row.start_date,
      end_date: row.end_date,
      schedule_time: row.schedule_time || null,
      seat_count: Number(row.seat_count),
      mode: row.mode || null,
      location: row.location || null,
      note: row.note || null,
      external_ref: row.external_ref || null,
      fiscal_year: target.fiscal_year,
      round_id: target.round_id,
    });
    if (!error) created++;
    else seq -= 1; // roll back the number if the insert failed so it isn't skipped
  }

  revalidatePath("/unit/classes");
  revalidatePath("/unit/import-classes");
  return { created };
}
