"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";

export type InstructorState = { error?: string; success?: string };

// Find an existing library instructor in this unit matching phone+email (the per-unit dedup key).
async function findDup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  unitId: string,
  phone: string | null,
  email: string | null,
) {
  if (!phone && !email) return null;
  let q = supabase.from("instructors").select("instructor_id").eq("unit_id", unitId);
  q = phone ? q.eq("phone", phone) : q.is("phone", null);
  q = email ? q.eq("email", email) : q.is("email", null);
  const { data } = await q.maybeSingle();
  return data?.instructor_id ?? null;
}

export async function createInstructor(_prev: InstructorState, formData: FormData): Promise<InstructorState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;

  if (!name) return { error: "กรุณากรอกชื่อวิทยากร" };

  const supabase = await createClient();
  if (await findDup(supabase, unitId, phone, email)) {
    return { error: "มีวิทยากรที่เบอร์/อีเมลนี้ในคลังของหน่วยแล้ว" };
  }

  const { error } = await supabase.from("instructors").insert({
    name,
    phone,
    email,
    unit_id: unitId,
  });
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/unit/instructors");
  return { success: "เพิ่มวิทยากรเข้าคลังแล้ว" };
}

export async function updateInstructor(_prev: InstructorState, formData: FormData): Promise<InstructorState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const instructorId = String(formData.get("instructor_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;

  if (!instructorId || !name) return { error: "กรุณากรอกชื่อวิทยากร" };

  const supabase = await createClient();
  const { data: own } = await supabase
    .from("instructors")
    .select("instructor_id")
    .eq("instructor_id", instructorId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!own) return { error: "ไม่พบวิทยากรนี้ในคลังของหน่วย" };

  const { error } = await supabase
    .from("instructors")
    .update({ name, phone, email })
    .eq("instructor_id", instructorId);
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/unit/instructors");
  return { success: "แก้ไขข้อมูลวิทยากรแล้ว" };
}

export async function deleteInstructor(unitIdArg: string, instructorId: string) {
  const { unitId } = await resolveActionUnit(unitIdArg);
  const supabase = await createClient();

  const { data: own } = await supabase
    .from("instructors")
    .select("instructor_id")
    .eq("instructor_id", instructorId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!own) throw new Error("ไม่พบวิทยากรนี้ในคลังของหน่วย");

  // Block deletion while the instructor is still the lead of any class (FK is RESTRICT).
  const { count } = await supabase
    .from("classes")
    .select("class_id", { count: "exact", head: true })
    .eq("lead_instructor_id", instructorId);
  if ((count ?? 0) > 0) {
    throw new Error("ลบไม่ได้ — วิทยากรนี้เป็นหัวหน้าผู้สอนของบางชั้นเรียนอยู่ (เปลี่ยนหัวหน้าผู้สอนก่อน)");
  }

  // class_instructors links cascade on delete.
  const { error } = await supabase.from("instructors").delete().eq("instructor_id", instructorId);
  if (error) throw new Error(error.message);

  revalidatePath("/unit/instructors");
}

// ───────────────────────── CSV import into the library ─────────────────────────
export type InstructorPreviewRow = {
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
  status: "pass" | "fail";
  reason?: string;
};
export type InstructorPreviewState = {
  error?: string;
  fileName?: string;
  rows?: InstructorPreviewRow[];
  passCount?: number;
  failCount?: number;
};

export async function previewInstructorImport(
  _prev: InstructorPreviewState,
  formData: FormData,
): Promise<InstructorPreviewState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "กรุณาเลือกไฟล์ CSV" };

  const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) return { error: `อ่านไฟล์ไม่สำเร็จ: ${parsed.errors[0].message}` };

  const supabase = await createClient();
  const seen = new Set<string>();
  const rows: InstructorPreviewRow[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const r = parsed.data[i];
    const name = (r.name ?? "").trim();
    const phone = (r.phone ?? "").trim();
    const email = (r.email ?? "").trim();
    let status: "pass" | "fail" = "pass";
    let reason: string | undefined;

    const key = `${phone}|${email}`;
    if (!name) {
      status = "fail";
      reason = "ขาดชื่อวิทยากร";
    } else if ((phone || email) && seen.has(key)) {
      status = "fail";
      reason = "เบอร์/อีเมลซ้ำภายในไฟล์เดียวกัน";
    } else if (await findDup(supabase, unitId, phone || null, email || null)) {
      status = "fail";
      reason = "มีวิทยากรนี้ในคลังของหน่วยแล้ว";
    }
    if (status === "pass" && (phone || email)) seen.add(key);
    rows.push({ rowNumber: i + 2, name, phone, email, status, reason });
  }

  return {
    fileName: file.name,
    rows,
    passCount: rows.filter((r) => r.status === "pass").length,
    failCount: rows.filter((r) => r.status === "fail").length,
  };
}

export type InstructorCommitState = { error?: string; created?: number };

export async function commitInstructorImport(
  _prev: InstructorCommitState,
  formData: FormData,
): Promise<InstructorCommitState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const rows: InstructorPreviewRow[] = JSON.parse(String(formData.get("rows") ?? "[]")).filter(
    (r: InstructorPreviewRow) => r.status === "pass",
  );
  if (rows.length === 0) return { error: "ไม่มีแถวที่ผ่านการตรวจสอบให้นำเข้า" };

  const supabase = await createClient();
  const payload = rows.map((r) => ({
    name: r.name,
    phone: r.phone || null,
    email: r.email || null,
    unit_id: unitId,
  }));
  const { data, error } = await supabase.from("instructors").insert(payload).select("instructor_id");
  if (error) return { error: `นำเข้าไม่สำเร็จ: ${error.message}` };

  revalidatePath("/unit/instructors");
  return { created: data?.length ?? 0 };
}
