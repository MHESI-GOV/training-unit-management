import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { ImportClient } from "./import-client";

export default async function UnitImportPage({
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
      <h1>นำเข้าผู้เรียนจากไฟล์ CSV</h1>
      <ImportClient unitId={unitId} classes={classOptions} />
    </main>
  );
}
