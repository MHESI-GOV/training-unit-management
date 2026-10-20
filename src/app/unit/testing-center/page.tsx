import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { ASSESSMENT_STANDARD_LABEL, TESTING_CENTER_STATUS_LABEL } from "@/lib/labels";
import { AppShell } from "@/components/layout/AppShell";
import { StatusForm } from "./status-form";

const STATUS_PILL: Record<string, string> = {
  not_registered: "muted",
  in_progress: "pending",
  registered: "done",
};

export default async function TestingCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  const supabase = await createClient();
  const { data: statuses } = await supabase
    .from("testing_center_statuses")
    .select("standard_type, status, evidence_ref, updated_at")
    .eq("unit_id", unitId);

  return (
    <AppShell profile={profile} active="testing-center" eyebrow="ศูนย์ทดสอบมาตรฐาน" title="สถานะศูนย์ทดสอบมาตรฐาน">
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {(statuses ?? []).map((s) => (
          <span key={s.standard_type} className={`pill ${STATUS_PILL[s.status] ?? "muted"}`}>
            {ASSESSMENT_STANDARD_LABEL[s.standard_type] ?? s.standard_type} —{" "}
            {TESTING_CENTER_STATUS_LABEL[s.status] ?? s.status}
          </span>
        ))}
        {(statuses ?? []).length === 0 && <span className="pill muted">ยังไม่มีข้อมูล</span>}
      </div>

      <section className="card" style={{ maxWidth: 400 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>อัปเดตสถานะ</h2>
        <div style={{ marginTop: 14 }}>
          <StatusForm unitId={unitId} />
        </div>
      </section>
    </AppShell>
  );
}
