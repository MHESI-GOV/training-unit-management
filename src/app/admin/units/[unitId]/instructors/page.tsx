import { createClient } from "@/lib/supabase/server";
import { fetchUnitCode } from "@/lib/unit-code";
import { teacherCode } from "@/lib/id-codes";
import { InstructorsManager, type InstructorRow } from "@/app/unit/instructors/instructors-manager";

export default async function UnitSheetInstructors({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const supabase = await createClient();

  const [{ data: instructors }, unit] = await Promise.all([
    supabase
      .from("instructors")
      .select("instructor_id, first_name, last_name, name, gender, affiliation, tester_status, phone, email, instructor_seq, class_instructors(count)")
      .eq("unit_id", unitId)
      .order("instructor_seq"),
    fetchUnitCode(supabase, unitId),
  ]);

  const rows: InstructorRow[] = (instructors ?? []).map((i) => ({
    instructor_id: i.instructor_id,
    first_name: i.first_name,
    last_name: i.last_name,
    name: i.name ?? "",
    gender: i.gender,
    affiliation: i.affiliation,
    tester_status: i.tester_status,
    phone: i.phone,
    email: i.email,
    teacher_code: teacherCode(unit.code, i.instructor_seq),
    class_count: (i.class_instructors as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));

  return <InstructorsManager unitId={unitId} instructors={rows} />;
}
