import Link from "next/link";
import { requireStaffProfile } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { UNIT_TYPE_LABEL, REGION_LABEL } from "@/lib/labels";
import { AppShell } from "@/components/layout/AppShell";

export default async function AdminUnitsPage() {
  const profile = await requireStaffProfile();

  const supabase = await createClient();
  const { data: units } = await supabase
    .from("training_units")
    .select("unit_id, name, type, region, training_unit_profiles(coordinator_name, phone)")
    .order("name");

  return (
    <AppShell profile={profile} active="units" eyebrow="หน่วยในระบบ" title="หน่วยฝึกอบรมทั้งหมด">
      {(units ?? []).length === 0 && <p className="footnote">ยังไม่มีหน่วยฝึกอบรมในระบบ</p>}

      <div style={{ display: "grid", gap: 14 }}>
        {(units ?? []).map((u) => (
          <article key={u.unit_id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <strong>{u.name}</strong>
              <div style={{ display: "flex", gap: 6 }}>
                <span className="pill study">{UNIT_TYPE_LABEL[u.type] ?? u.type}</span>
                <span className="pill muted">{REGION_LABEL[u.region] ?? u.region}</span>
              </div>
            </div>
            {u.training_unit_profiles && (
              <p className="footnote" style={{ marginTop: 6 }}>
                ผู้ประสานงาน: {u.training_unit_profiles.coordinator_name ?? "—"}{" "}
                {u.training_unit_profiles.phone ? `(${u.training_unit_profiles.phone})` : ""}
              </p>
            )}
            <p style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, fontSize: 13 }}>
              <Link href={`/unit/profile?unit_id=${u.unit_id}`}>โปรไฟล์หน่วย</Link>
              <Link href={`/unit/classes?unit_id=${u.unit_id}`}>รุ่นฝึกอบรม</Link>
              <Link href={`/unit/learners?unit_id=${u.unit_id}`}>ผู้เรียน</Link>
              <Link href={`/unit/testing-center?unit_id=${u.unit_id}`}>ศูนย์ทดสอบมาตรฐาน</Link>
              <Link href={`/unit/import?unit_id=${u.unit_id}`}>นำเข้าผู้เรียน CSV</Link>
              <Link href={`/unit/import-assessments?unit_id=${u.unit_id}`}>นำเข้าผลทดสอบ CSV</Link>
              <Link href={`/unit/import-classes?unit_id=${u.unit_id}`}>นำเข้ารุ่นฝึกอบรม CSV</Link>
              <Link href={`/unit/import-instructors?unit_id=${u.unit_id}`}>นำเข้าวิทยากร CSV</Link>
              <Link href={`/?unit_id=${u.unit_id}`}>แดชบอร์ด</Link>
            </p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
