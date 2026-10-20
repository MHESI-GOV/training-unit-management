import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { ASSESSMENT_STANDARD_LABEL, TESTING_CENTER_STATUS_LABEL } from "@/lib/labels";
import { StatusForm } from "./status-form";

export default async function TestingCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff } = await resolvePageUnit(unit_id);

  const supabase = await createClient();
  const { data: statuses } = await supabase
    .from("testing_center_statuses")
    .select("standard_type, status, evidence_ref, updated_at")
    .eq("unit_id", unitId);

  return (
    <main style={{ maxWidth: 480, margin: "3rem auto", fontFamily: "system-ui" }}>
      {isStaff && (
        <p>
          <Link href="/admin/units">กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <h1>สถานะศูนย์ทดสอบมาตรฐาน</h1>
      <ul>
        {(statuses ?? []).map((s) => (
          <li key={s.standard_type}>
            {ASSESSMENT_STANDARD_LABEL[s.standard_type] ?? s.standard_type} —{" "}
            {TESTING_CENTER_STATUS_LABEL[s.status] ?? s.status}
          </li>
        ))}
        {(statuses ?? []).length === 0 && <li>ยังไม่มีข้อมูล</li>}
      </ul>
      <h2>อัปเดตสถานะ</h2>
      <StatusForm unitId={unitId} />
    </main>
  );
}
