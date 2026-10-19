import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "./course-form";

const CAN_EDIT = ["web_master", "central_staff", "unit_coordinator"];

export default async function CoursesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("course_id, name, total_hours, theory_hours, practical_hours, description")
    .order("name");

  return (
    <main style={{ maxWidth: 600, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>หลักสูตร</h1>
      <ul>
        {(courses ?? []).map((c) => (
          <li key={c.course_id}>
            {c.name} — {c.total_hours} ชม.
            {c.theory_hours != null && c.practical_hours != null && (
              <> (ทฤษฎี {c.theory_hours} / ปฏิบัติ {c.practical_hours})</>
            )}
          </li>
        ))}
        {(courses ?? []).length === 0 && <li>ยังไม่มีหลักสูตร</li>}
      </ul>

      {CAN_EDIT.includes(profile.role) && (
        <>
          <h2 style={{ marginTop: 24 }}>เพิ่มหลักสูตรใหม่</h2>
          <CourseForm />
        </>
      )}
    </main>
  );
}
