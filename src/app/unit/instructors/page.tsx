import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { InstructorsManager, type InstructorRow } from "./instructors-manager";

export default async function UnitInstructorsPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

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

  return (
    <AppShell profile={profile} active="instructors" eyebrow="คลังวิทยากรของหน่วย" title="คลังวิทยากร (Instructor Library)">
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <p className="footnote" style={{ marginBottom: 18 }}>
        รวมรายชื่อวิทยากรของหน่วยไว้ที่เดียว เมื่อเปิดชั้นเรียนสามารถเลือกวิทยากรจากคลังนี้เข้าชั้นเรียนได้เลย
      </p>
      <InstructorsManager unitId={unitId} instructors={rows} />
    </AppShell>
  );
}
