import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ClassList, type ClassRow } from "./class-list";

export default async function UnitClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  const supabase = await createClient();

  const [{ data: courses }, { data: instructors }, { data: classes }] = await Promise.all([
    supabase.from("courses").select("course_id, name").order("name"),
    supabase.from("instructors").select("instructor_id, name").eq("unit_id", unitId).order("name"),
    supabase
      .from("classes")
      .select(
        "class_id, batch_code, name, status, start_date, end_date, schedule_time, seat_count, courses(name), lead:instructors!classes_lead_instructor_id_fkey(name), enrollments(count), class_instructors(count)",
      )
      .eq("unit_id", unitId)
      .order("batch_code", { ascending: true }),
  ]);

  const rows: ClassRow[] = (classes ?? []).map((c) => ({
    class_id: c.class_id,
    batch_code: c.batch_code,
    name: c.name,
    course_name: c.courses?.name ?? "—",
    status: c.status,
    start_date: c.start_date,
    end_date: c.end_date,
    schedule_time: c.schedule_time,
    seat_count: c.seat_count,
    learner_count: (c.enrollments as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    instructor_count: (c.class_instructors as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    lead_instructor_name: (c.lead as unknown as { name: string } | null)?.name ?? null,
  }));

  return (
    <AppShell profile={profile} active="classes" eyebrow="จัดการชั้นเรียน" title="จัดการชั้นเรียน (Class)">
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <ClassList
        unitId={unitId}
        isStaff={isStaff}
        courses={courses ?? []}
        instructors={instructors ?? []}
        classes={rows}
      />
    </AppShell>
  );
}
