import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { ClassForm } from "./class-form";
import { InstructorForm } from "./instructor-form";

export default async function UnitClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff } = await resolvePageUnit(unit_id);

  const supabase = await createClient();

  const [{ data: courses }, { data: classes }] = await Promise.all([
    supabase.from("courses").select("course_id, name").order("name"),
    supabase
      .from("classes")
      .select(
        "class_id, start_date, end_date, seat_count, external_ref, courses(name), class_instructors(role_in_class, instructors(name, phone, email))",
      )
      .eq("unit_id", unitId)
      .order("start_date", { ascending: false }),
  ]);

  return (
    <main style={{ maxWidth: 640, margin: "3rem auto", fontFamily: "system-ui" }}>
      {isStaff && (
        <p>
          <Link href="/admin/units">กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <h1>รุ่นฝึกอบรมของหน่วย</h1>

      <h2>สร้างรุ่นฝึกอบรมใหม่</h2>
      <ClassForm unitId={unitId} courses={courses ?? []} />

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
          <InstructorForm unitId={unitId} classId={cls.class_id} />
        </div>
      ))}
    </main>
  );
}
