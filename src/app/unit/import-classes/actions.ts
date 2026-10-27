"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";

export type PreviewRow = {
  rowNumber: number;
  course_name: string;
  course_id?: string;
  start_date: string;
  end_date: string;
  seat_count: string;
  external_ref: string;
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function previewClassImport(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  await resolveActionUnit(formData.get("unit_id")?.toString());

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
  const { data: courses } = await supabase.from("courses").select("course_id, name");
  const courseByName = new Map((courses ?? []).map((c) => [c.name.trim(), c.course_id]));

  const rows: PreviewRow[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const r = parsed.data[i];
    const rowNumber = i + 2;
    const courseName = (r.course_name ?? "").trim();
    const startDate = (r.start_date ?? "").trim();
    const endDate = (r.end_date ?? "").trim();
    const seatCountRaw = (r.seat_count ?? "").trim();
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
      reason = "รูปแบบวันที่ต้องเป็น YYYY-MM-DD";
    } else if (startDate > endDate) {
      status = "fail";
      reason = "วันเริ่มต้องไม่มากกว่าวันสิ้นสุด";
    } else if (!Number.isFinite(seatCount) || seatCount <= 0) {
      status = "fail";
      reason = "จำนวนที่นั่งต้องเป็นเลขจำนวนเต็มบวก";
    } else {
      courseId = courseByName.get(courseName);
    }

    rows.push({
      rowNumber,
      course_name: courseName,
      course_id: courseId,
      start_date: startDate,
      end_date: endDate,
      seat_count: seatCountRaw,
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
      start_date: row.start_date,
      end_date: row.end_date,
      seat_count: Number(row.seat_count),
      external_ref: row.external_ref || null,
    });
    if (!error) created++;
    else seq -= 1; // roll back the number if the insert failed so it isn't skipped
  }

  revalidatePath("/unit/classes");
  revalidatePath("/unit/import-classes");
  return { created };
}
