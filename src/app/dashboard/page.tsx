import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { UnitFilter } from "./unit-filter";
import { ExportLearners } from "./export-learners";

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div style={{ border: "1px solid #ccc", padding: 12, minWidth: 180 }}>
      <div style={{ fontSize: 13, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: "bold" }}>{value.toLocaleString("th-TH")}</div>
      {note && <div style={{ fontSize: 12, color: "#888" }}>{note}</div>}
    </div>
  );
}

function RatePill({ label, passed, tested }: { label: string; passed: number; tested: number }) {
  if (tested === 0) {
    return (
      <div style={{ border: "1px solid #ccc", padding: 12, minWidth: 180, color: "#999" }}>
        <div style={{ fontSize: 13 }}>{label}</div>
        <div style={{ fontSize: 20 }}>ยังไม่มีข้อมูล</div>
      </div>
    );
  }
  const pct = Math.round((passed / tested) * 1000) / 10;
  return (
    <div style={{ border: "1px solid #ccc", padding: 12, minWidth: 180 }}>
      <div style={{ fontSize: 13, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: "bold" }}>{pct}%</div>
      <div style={{ fontSize: 12, color: "#888" }}>
        ผ่าน {passed.toLocaleString("th-TH")} / เข้าทดสอบ {tested.toLocaleString("th-TH")}
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role === "unit_coordinator" && !profile.unit_scope) {
    redirect("/");
  }

  const { unit_id } = await searchParams;
  const canFilterByUnit = profile.role === "web_master" || profile.role === "central_staff";
  const filterUnitId = profile.role === "unit_coordinator" ? undefined : canFilterByUnit ? unit_id : undefined;

  const supabase = await createClient();

  const [{ data: kpiRows, error }, { data: units }] = await Promise.all([
    supabase.rpc("get_dashboard_kpis", { p_unit_id: filterUnitId || undefined }),
    canFilterByUnit
      ? supabase.from("training_units").select("unit_id, name").order("name")
      : Promise.resolve({ data: null }),
  ]);

  const kpi = kpiRows?.[0];

  return (
    <main style={{ maxWidth: 800, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>แดชบอร์ดภาพรวมโครงการ</h1>

      {canFilterByUnit && <UnitFilter units={units ?? []} selected={unit_id ?? ""} />}

      {error && <p style={{ color: "crimson" }}>โหลดข้อมูลไม่สำเร็จ: {error.message}</p>}

      {kpi && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <Stat label="KPI-1 ผู้สมัครเข้าร่วม" value={kpi.applicants} />
            <Stat label="KPI-2 ผู้เข้ารับการฝึกอบรมจริง" value={kpi.attended} />
            <Stat label="KPI-3 ผู้สำเร็จหลักสูตร" value={kpi.completed} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <RatePill
              label="KPI-4 %ผ่านมาตรฐานกรมอนามัย"
              passed={kpi.anamai_passed}
              tested={kpi.anamai_tested}
            />
            <RatePill label="KPI-5 %ผ่าน DSD ระดับ 1" passed={kpi.dsd_passed} tested={kpi.dsd_tested} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <Stat label="KPI-6 หน่วยที่เป็นศูนย์ทดสอบ DSD" value={kpi.dsd_centers} />
            <Stat label="KPI-7 หน่วยที่เป็นศูนย์ทดสอบคุณวุฒิวิชาชีพ" value={kpi.pq_centers} />
          </div>

          <p style={{ marginTop: 24, fontSize: 13, color: "#888" }}>
            อัปเดตจากหน่วยฝึกอบรม {kpi.units_with_data.toLocaleString("th-TH")}/
            {kpi.total_units.toLocaleString("th-TH")} แห่งที่มีข้อมูลผู้เรียน
          </p>
        </>
      )}

      {canFilterByUnit && <ExportLearners unitId={unit_id ?? ""} />}
    </main>
  );
}
