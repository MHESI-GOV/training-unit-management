import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ClassForm } from "./class-form";
import { InstructorForm } from "./instructor-form";

export default async function UnitClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

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
    <AppShell profile={profile} active="classes" eyebrow="หลักสูตร / วิทยากร" title="รุ่นฝึกอบรมของหน่วย">
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <p style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Link href={`/unit/import-classes?unit_id=${unitId}`} className="btn secondary">
          นำเข้ารุ่นฝึกอบรมจากไฟล์ CSV
        </Link>
        <Link href={`/unit/import-instructors?unit_id=${unitId}`} className="btn secondary">
          นำเข้าวิทยากรจากไฟล์ CSV
        </Link>
      </p>

      <section className="card" style={{ marginBottom: 24, maxWidth: 440 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>สร้างรุ่นฝึกอบรมใหม่</h2>
        <div style={{ marginTop: 14 }}>
          <ClassForm unitId={unitId} courses={courses ?? []} />
        </div>
      </section>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>รุ่นฝึกอบรมที่มีอยู่</h2>
      {(classes ?? []).length === 0 && <p className="footnote">ยังไม่มีรุ่นฝึกอบรม</p>}

      <div style={{ display: "grid", gap: 14 }}>
        {(classes ?? []).map((cls) => (
          <article key={cls.class_id} className="card">
            <strong>{cls.courses?.name}</strong>
            <p className="footnote" style={{ marginTop: 2 }}>
              {cls.start_date} ถึง {cls.end_date} · {cls.seat_count} ที่นั่ง
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, marginBottom: 10 }}>
              {cls.class_instructors.map((ci, i) => (
                <span key={i} className="pill study">
                  {ci.instructors?.name} ({ci.role_in_class})
                </span>
              ))}
              {cls.class_instructors.length === 0 && <span className="pill muted">ยังไม่มีวิทยากร</span>}
            </div>
            <InstructorForm unitId={unitId} classId={cls.class_id} />
          </article>
        ))}
      </div>
    </AppShell>
  );
}
