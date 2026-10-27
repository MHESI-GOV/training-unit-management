import { createClient } from "@/lib/supabase/server";
import { InstructorsManager, type InstructorRow } from "@/app/unit/instructors/instructors-manager";

export default async function UnitSheetInstructors({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const supabase = await createClient();

  const { data: instructors } = await supabase
    .from("instructors")
    .select("instructor_id, name, phone, email, class_instructors(count)")
    .eq("unit_id", unitId)
    .order("name");

  const rows: InstructorRow[] = (instructors ?? []).map((i) => ({
    instructor_id: i.instructor_id,
    name: i.name,
    phone: i.phone,
    email: i.email,
    class_count: (i.class_instructors as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));

  return <InstructorsManager unitId={unitId} instructors={rows} />;
}
