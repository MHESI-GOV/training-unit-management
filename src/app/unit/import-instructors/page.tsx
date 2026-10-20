import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { ImportClient } from "./import-client";

export default async function ImportInstructorsPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff } = await resolvePageUnit(unit_id);

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
    <main style={{ maxWidth: 720, margin: "3rem auto", fontFamily: "system-ui" }}>
      {isStaff && (
        <p>
          <Link href="/admin/units">กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <h1>นำเข้าวิทยากรจากไฟล์ CSV</h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        เลือกรุ่นฝึกอบรมที่จะเพิ่มวิทยากร — รุ่นต้องมีอยู่แล้วที่{" "}
        <Link href={`/unit/classes?unit_id=${unitId}`}>หน้ารุ่นฝึกอบรม</Link> ก่อน
      </p>
      <ImportClient unitId={unitId} classes={classOptions} />
    </main>
  );
}
