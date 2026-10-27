import { createClient } from "@/lib/supabase/server";
import { ClassList, type ClassRow } from "@/app/unit/classes/class-list";

export default async function UnitSheetClasses({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
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
    <ClassList unitId={unitId} isStaff courses={courses ?? []} instructors={instructors ?? []} classes={rows} />
  );
}
