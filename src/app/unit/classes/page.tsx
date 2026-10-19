import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { ClassForm } from "./class-form";
import { InstructorForm } from "./instructor-form";

export default async function UnitClassesPage() {
  const profile = await requireProfile();
  if (profile.role !== "unit_coordinator" || !profile.unit_scope) {
    redirect("/");
  }

  const supabase = await createClient();

  const [{ data: courses }, { data: classes }] = await Promise.all([
    supabase.from("courses").select("course_id, name").order("name"),
    supabase
      .from("classes")
      .select(
        "class_id, start_date, end_date, seat_count, external_ref, courses(name), class_instructors(role_in_class, instructors(name, phone, email))",
      )
      .eq("unit_id", profile.unit_scope)
      .order("start_date", { ascending: false }),
  ]);

  return (
    <main style={{ maxWidth: 640, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>รุ่นฝึกอบรมของหน่วย</h1>

      <h2>สร้างรุ่นฝึกอบรมใหม่</h2>
      <ClassForm courses={courses ?? []} />

      <h2 style={{ marginTop: 32 }}>รุ่นฝึกอบรมที่มีอยู่</h2>
      {(classes ?? []).length === 0 && <p>ยังไม่มีรุ่นฝึกอบรม</p>}
      {(classes ?? []).map((cls) => (
        <div key={cls.class_id} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 16 }}>
          <p>
            <strong>{cls.courses?.name}</strong> — {cls.start_date} ถึง {cls.end_date} (
            {cls.seat_count} ที่นั่ง)
          </p>
          <ul>
            {cls.class_instructors.map((ci, i) => (
              <li key={i}>
                {ci.instructors?.name} ({ci.role_in_class})
              </li>
            ))}
            {cls.class_instructors.length === 0 && <li>ยังไม่มีวิทยากร</li>}
          </ul>
          <InstructorForm classId={cls.class_id} />
        </div>
      ))}
    </main>
  );
}
