"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";

export type PreviewRow = {
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
  role_in_class: string;
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

export async function previewInstructorImport(
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

  const rows: PreviewRow[] = parsed.data.map((r, i) => {
    const name = (r.name ?? "").trim();
    const phone = (r.phone ?? "").trim();
    const email = (r.email ?? "").trim();
    const roleInClass = (r.role_in_class ?? "").trim() || "วิทยากร";

    return {
      rowNumber: i + 2,
      name,
      phone,
      email,
      role_in_class: roleInClass,
      status: name ? "pass" : "fail",
      reason: name ? undefined : "ขาดชื่อวิทยากร",
    };
  });

  return {
    fileName: file.name,
    rows,
    passCount: rows.filter((r) => r.status === "pass").length,
    failCount: rows.filter((r) => r.status === "fail").length,
  };
}

export type CommitState = { error?: string; created?: number };

export async function commitInstructorImport(
  _prev: CommitState,
  formData: FormData,
): Promise<CommitState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());

  const classId = String(formData.get("class_id") ?? "");
  if (!classId) return { error: "กรุณาเลือกรุ่นฝึกอบรม" };

  const supabase = await createClient();

  // Confirms this class belongs to the caller's resolved unit -- same ownership check as
  // the single-add form (addInstructorToClass in ../classes/actions.ts).
  const { data: cls } = await supabase
    .from("classes")
    .select("class_id")
    .eq("class_id", classId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!cls) return { error: "ไม่พบรุ่นฝึกอบรมนี้ในหน่วยของคุณ" };

  const rowsJson = String(formData.get("rows") ?? "[]");
  const rows: PreviewRow[] = JSON.parse(rowsJson).filter((r: PreviewRow) => r.status === "pass");
  if (rows.length === 0) return { error: "ไม่มีแถวที่ผ่านการตรวจสอบให้นำเข้า" };

  let created = 0;

  for (const row of rows) {
    const phone = row.phone || null;
    const email = row.email || null;

    let instructorId: string | null = null;
    if (phone || email) {
      let query = supabase.from("instructors").select("instructor_id");
      query = phone ? query.eq("phone", phone) : query.is("phone", null);
      query = email ? query.eq("email", email) : query.is("email", null);
      const { data: existing } = await query.maybeSingle();
      instructorId = existing?.instructor_id ?? null;
    }

    if (!instructorId) {
      const { data: createdInstructor, error: createErr } = await supabase
        .from("instructors")
        .insert({ name: row.name, phone, email })
        .select("instructor_id")
        .single();
      if (createErr) continue;
      instructorId = createdInstructor.instructor_id;
    }

    const { error: linkErr } = await supabase.from("class_instructors").insert({
      class_id: classId,
      instructor_id: instructorId,
      role_in_class: row.role_in_class,
    });
    if (!linkErr) created++;
  }

  revalidatePath("/unit/classes");
  revalidatePath("/unit/import-instructors");
  return { created };
}
