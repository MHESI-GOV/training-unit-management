import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ImportClient } from "./import-client";

export default async function ImportInstructorsPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("class_id, start_date, courses(name)")
    .eq("unit_id", unitId)
    .order("start_date", { ascending: false });

  const classOptions = (classes ?? []).map((c) => ({
    class_id: c.class_id,
    label: `${c.courses?.name} (${c.start_date})`,
  }));

  return (
    <AppShell profile={profile} active="import-instructors" eyebrow="นำเข้าข้อมูล" title="นำเข้าวิทยากรจากไฟล์ CSV">
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <p className="footnote" style={{ marginBottom: 20 }}>
        เลือกรุ่นฝึกอบรมที่จะเพิ่มวิทยากร — รุ่นต้องมีอยู่แล้วที่{" "}
        <Link href={`/unit/classes?unit_id=${unitId}`}>หน้ารุ่นฝึกอบรม</Link> ก่อน
      </p>
      <ImportClient unitId={unitId} classes={classOptions} />
    </AppShell>
  );
}
