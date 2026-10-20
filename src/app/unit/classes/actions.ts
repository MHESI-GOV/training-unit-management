"use server";

import { revalidatePath } from "next/cache";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";

export type ClassFormState = { error?: string };

export async function createClass(
  _prev: ClassFormState,
  formData: FormData,
): Promise<ClassFormState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());

  const courseId = String(formData.get("course_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const seatCount = Number(formData.get("seat_count"));
  const externalRef = String(formData.get("external_ref") ?? "").trim() || null;

  if (!courseId || !startDate || !endDate || !Number.isFinite(seatCount) || seatCount <= 0) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง" };
  }
  if (startDate > endDate) {
    return { error: "วันเริ่มต้องไม่มากกว่าวันสิ้นสุด" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("classes").insert({
    course_id: courseId,
    unit_id: unitId,
    start_date: startDate,
    end_date: endDate,
    seat_count: seatCount,
    external_ref: externalRef,
  });

  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/unit/classes");
  return {};
}

export type InstructorFormState = { error?: string };

export async function addInstructorToClass(
  _prev: InstructorFormState,
  formData: FormData,
): Promise<InstructorFormState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());

  const classId = String(formData.get("class_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const roleInClass = String(formData.get("role_in_class") ?? "").trim() || "วิทยากร";

  if (!classId || !name) {
    return { error: "กรุณากรอกชื่อวิทยากร" };
  }

  const supabase = await createClient();

  // Confirms this class actually belongs to the caller's own unit before touching it —
  // RLS would also reject the class_instructors insert below, but this gives a clear error
  // instead of a confusing silent no-op/RLS denial.
  const { data: cls } = await supabase
    .from("classes")
    .select("class_id")
    .eq("class_id", classId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!cls) return { error: "ไม่พบรุ่นฝึกอบรมนี้ในหน่วยของคุณ" };

  let instructorId: string | null = null;
  if (phone || email) {
    let query = supabase.from("instructors").select("instructor_id");
    query = phone ? query.eq("phone", phone) : query.is("phone", null);
    query = email ? query.eq("email", email) : query.is("email", null);
    const { data: existing } = await query.maybeSingle();
    instructorId = existing?.instructor_id ?? null;
  }

  if (!instructorId) {
    const { data: created, error: createErr } = await supabase
      .from("instructors")
      .insert({ name, phone, email })
      .select("instructor_id")
      .single();
    if (createErr) return { error: `บันทึกวิทยากรไม่สำเร็จ: ${createErr.message}` };
    instructorId = created.instructor_id;
  }

  const { error: linkErr } = await supabase.from("class_instructors").insert({
    class_id: classId,
    instructor_id: instructorId,
    role_in_class: roleInClass,
  });

  if (linkErr) return { error: `ผูกวิทยากรกับรุ่นไม่สำเร็จ: ${linkErr.message}` };

  revalidatePath("/unit/classes");
  return {};
}
