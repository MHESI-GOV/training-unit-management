"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";

export type CourseFormState = { error?: string };

const CAN_EDIT_COURSES = ["web_master", "central_staff", "unit_coordinator"] as const;

export async function createCourse(
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const profile = await requireProfile();
  if (!CAN_EDIT_COURSES.includes(profile.role as (typeof CAN_EDIT_COURSES)[number])) {
    return { error: "ไม่มีสิทธิ์สร้างหลักสูตร" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const totalHours = Number(formData.get("total_hours"));
  const theoryHours = formData.get("theory_hours") ? Number(formData.get("theory_hours")) : null;
  const practicalHours = formData.get("practical_hours")
    ? Number(formData.get("practical_hours"))
    : null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name || !Number.isFinite(totalHours) || totalHours <= 0) {
    return { error: "กรุณากรอกชื่อหลักสูตรและจำนวนชั่วโมงให้ถูกต้อง" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("courses").insert({
    name,
    total_hours: totalHours,
    theory_hours: theoryHours,
    practical_hours: practicalHours,
    description,
  });

  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/courses");
  return {};
}
