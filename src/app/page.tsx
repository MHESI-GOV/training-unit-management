import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { PublicHome } from "@/components/home/PublicHome";
import { UnitFilter } from "@/components/dashboard/unit-filter";
import { ExportLearners } from "@/components/dashboard/export-learners";
import { ExportClasses } from "@/components/dashboard/export-classes";

function Stat({ label, value, note }: { label: string; value: number | null; note?: string }) {
  if (value === null) {
    return (
      <div className="stat-tile suppressed">
        <div className="stat-label">{label}</div>
        <div className="stat-value">ข้อมูลน้อยเกินไปที่จะแสดงผลได้</div>
      </div>
    );
  }
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value.toLocaleString("th-TH")}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

function RatePill({
  label,
  passed,
  tested,
}: {
  label: string;
  passed: number | null;
  tested: number | null;
}) {
  if (tested === null) {
    return (
      <div className="stat-tile suppressed">
        <div className="stat-label">{label}</div>
        <div className="stat-value">ข้อมูลน้อยเกินไปที่จะแสดงผลได้</div>
      </div>
    );
  }
  if (tested === 0) {
    return (
      <div className="stat-tile suppressed">
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ fontSize: 18 }}>
          ยังไม่มีข้อมูล
        </div>
      </div>
    );
  }
  const passedCount = passed ?? 0;
  const pct = Math.round((passedCount / tested) * 1000) / 10;
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{pct}%</div>
      <div className="stat-note">
        ผ่าน {passedCount.toLocaleString("th-TH")} / เข้าทดสอบ {tested.toLocaleString("th-TH")}
      </div>
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { email, profile } = await getCurrentProfile();
  const { unit_id } = await searchParams;

  const pendingUnitSetup = profile?.role === "unit_coordinator" && !profile.unit_scope;
  const canFilterByUnit = profile?.role === "web_master" || profile?.role === "central_staff";
  const filterUnitId = profile?.role === "unit_coordinator" ? undefined : canFilterByUnit ? unit_id : undefined;

  const supabase = await createClient();
  const [{ data: kpiRows, error }, { data: units }] = await Promise.all([
    supabase.rpc("get_dashboard_kpis", { p_unit_id: filterUnitId || undefined }),
    canFilterByUnit
      ? supabase.from("training_units").select("unit_id, name").order("name")
      : Promise.resolve({ data: null }),
  ]);
  const kpi = kpiRows?.[0];

  // Logged-out visitors get the standalone marketing/landing layout (top nav + hero + stat
  // cards), not the sidebar app shell -- the sidebar only makes sense once there's a role-
  // specific menu to show.
  if (!profile) {
    return kpi ? (
      <PublicHome kpi={kpi} />
    ) : (
      <main style={{ maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
        <p style={{ color: "var(--danger)" }}>โหลดข้อมูลไม่สำเร็จ{error ? `: ${error.message}` : ""}</p>
        <Link href="/login" className="btn primary" style={{ marginTop: 14 }}>
          เข้าสู่ระบบ
        </Link>
      </main>
    );
  }

  return (
    <AppShell profile={profile} active="home" eyebrow="ภาพรวมโครงการ" title="หนึ่งหมู่บ้าน หนึ่งเชฟอาหารไทย">
      <p className="footnote" style={{ marginBottom: 16 }}>
        เข้าสู่ระบบในนาม <strong>{email}</strong>
      </p>

      {pendingUnitSetup && (
        <section className="notice" style={{ background: "#fff3da", color: "#76520c", border: "1px solid #f0d9a6" }}>
          บัญชีนี้ยังไม่ได้ผูกกับหน่วยฝึกอบรมใด —{" "}
          <Link href="/unit-setup" style={{ fontWeight: 600 }}>
            กรอกข้อมูลหน่วยฝึกอบรม
          </Link>{" "}
          ก่อนจึงจะใช้งานส่วนอื่นได้
        </section>
      )}

      {canFilterByUnit && <UnitFilter units={units ?? []} selected={unit_id ?? ""} />}

      {error && <p style={{ color: "var(--danger)" }}>โหลดข้อมูลไม่สำเร็จ: {error.message}</p>}

      {kpi && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: canFilterByUnit ? 16 : 20 }}>
            <Stat label="KPI-1 ผู้สมัครเข้าร่วม" value={kpi.applicants} />
            <Stat label="KPI-2 ผู้เข้ารับการฝึกอบรมจริง" value={kpi.attended} />
            <Stat label="KPI-3 ผู้สำเร็จหลักสูตร" value={kpi.completed} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <RatePill label="KPI-4 %ผ่านมาตรฐานกรมอนามัย" passed={kpi.anamai_passed} tested={kpi.anamai_tested} />
            <RatePill label="KPI-5 %ผ่าน DSD ระดับ 1" passed={kpi.dsd_passed} tested={kpi.dsd_tested} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <Stat label="KPI-6 หน่วยที่เป็นศูนย์ทดสอบ DSD" value={kpi.dsd_centers} />
            <Stat label="KPI-7 หน่วยที่เป็นศูนย์ทดสอบคุณวุฒิวิชาชีพ" value={kpi.pq_centers} />
          </div>

          <p className="footnote" style={{ marginTop: 20 }}>
            อัปเดตจากหน่วยฝึกอบรม {kpi.units_with_data.toLocaleString("th-TH")}/
            {kpi.total_units.toLocaleString("th-TH")} แห่งที่มีข้อมูลผู้เรียน
          </p>
        </>
      )}

      {canFilterByUnit && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <ExportLearners unitId={unit_id ?? ""} />
          <ExportClasses unitId={unit_id ?? ""} />
        </div>
      )}
    </AppShell>
  );
}
