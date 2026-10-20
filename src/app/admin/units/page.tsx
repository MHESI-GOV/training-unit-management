import Link from "next/link";
import { requireStaffProfile } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { UNIT_TYPE_LABEL, REGION_LABEL } from "@/lib/labels";

export default async function AdminUnitsPage() {
  await requireStaffProfile();

  const supabase = await createClient();
  const { data: units } = await supabase
    .from("training_units")
    .select("unit_id, name, type, region, training_unit_profiles(coordinator_name, phone)")
    .order("name");

  return (
    <main style={{ maxWidth: 800, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>หน่วยฝึกอบรมทั้งหมด</h1>
      <p>
        <Link href="/">กลับหน้าหลัก</Link>
      </p>

      {(units ?? []).length === 0 && <p>ยังไม่มีหน่วยฝึกอบรมในระบบ</p>}

      {(units ?? []).map((u) => (
        <div key={u.unit_id} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
          <p>
            <strong>{u.name}</strong> — {UNIT_TYPE_LABEL[u.type] ?? u.type} —{" "}
            {REGION_LABEL[u.region] ?? u.region}
          </p>
          {u.training_unit_profiles && (
            <p style={{ fontSize: 13, color: "#666" }}>
              ผู้ประสานงาน: {u.training_unit_profiles.coordinator_name ?? "—"}{" "}
              {u.training_unit_profiles.phone ? `(${u.training_unit_profiles.phone})` : ""}
            </p>
          )}
          <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={`/unit/profile?unit_id=${u.unit_id}`}>โปรไฟล์หน่วย</Link>
            <Link href={`/unit/classes?unit_id=${u.unit_id}`}>รุ่นฝึกอบรม</Link>
            <Link href={`/unit/learners?unit_id=${u.unit_id}`}>ผู้เรียน</Link>
            <Link href={`/unit/testing-center?unit_id=${u.unit_id}`}>ศูนย์ทดสอบมาตรฐาน</Link>
            <Link href={`/unit/import?unit_id=${u.unit_id}`}>นำเข้าผู้เรียน CSV</Link>
            <Link href={`/unit/import-assessments?unit_id=${u.unit_id}`}>นำเข้าผลทดสอบ CSV</Link>
            <Link href={`/unit/import-classes?unit_id=${u.unit_id}`}>นำเข้ารุ่นฝึกอบรม CSV</Link>
            <Link href={`/unit/import-instructors?unit_id=${u.unit_id}`}>นำเข้าวิทยากร CSV</Link>
            <Link href={`/dashboard?unit_id=${u.unit_id}`}>แดชบอร์ด</Link>
          </p>
        </div>
      ))}
    </main>
  );
}
