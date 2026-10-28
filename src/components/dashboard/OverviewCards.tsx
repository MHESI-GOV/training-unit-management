import { Building2, Users, ShieldCheck, Award, Medal } from "lucide-react";
import { InstitutionDonut } from "./InstitutionDonut";
import { DonutChart } from "./DonutChart";
import { MapSection } from "./MapSection";
import { PyramidChart } from "./PyramidChart";
import { REGION_ORDER, REGION_LABEL, REGION_COLOR } from "@/lib/labels";
import { type Overview, type Pyramid, type DashFilters, fmt } from "@/lib/dashboard";

// The shared Dashboard overview layout — rendered identically on the authenticated dashboard
// (src/app/page.tsx) and the public Home (components/home/PublicHome.tsx). Per the user's standing
// instruction, any dashboard layout change lives here so BOTH pages change together (see memory
// feedback_dashboard_includes_home). Region rows and the institution-type donut are click-to-filter.
function IconBadge({ icon, bg, color }: { icon: React.ReactNode; bg: string; color: string }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {icon}
    </div>
  );
}

function BigValue({ value, unit }: { value: number | null; unit: string }) {
  if (value === null) {
    return <div style={{ fontSize: 15, color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>{fmt(value)}</div>;
  }
  return (
    <div style={{ marginTop: 2 }}>
      <span style={{ fontSize: 30, fontWeight: 700, color: "var(--ink)" }}>{value.toLocaleString("th-TH")}</span>
      <span style={{ fontSize: 14, color: "var(--muted)", marginLeft: 6 }}>{unit}</span>
    </div>
  );
}

function CountCard({
  label, unit, total, byRegion, icon, iconBg, iconColor, onRegionClick, activeRegion,
}: {
  label: string;
  unit: string;
  total: number | null;
  byRegion: Record<string, number | null>;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  onRegionClick: (region: string) => void;
  activeRegion: string | null;
}) {
  return (
    <section className="card" style={{ flex: "1 1 300px", minWidth: 280 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <IconBadge icon={icon} bg={iconBg} color={iconColor} />
        <div>
          <div className="stat-label">{label}</div>
          <BigValue value={total} unit={unit} />
        </div>
      </div>

      <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, margin: "16px 0 10px" }}>รายภูมิภาค (คลิกเพื่อกรอง)</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px" }}>
        {REGION_ORDER.map((region) => {
          const v = byRegion[region];
          const active = activeRegion === region;
          return (
            <button
              key={region}
              type="button"
              onClick={() => onRegionClick(region)}
              aria-pressed={active}
              style={{
                display: "flex", alignItems: "center", gap: 8, fontSize: 13, width: "100%",
                border: active ? "1px solid #9ec3ee" : "1px solid transparent",
                background: active ? "#eaf3fd" : "transparent", cursor: "pointer",
                borderRadius: 7, padding: "4px 8px", color: "inherit", font: "inherit", textAlign: "left",
              }}
            >
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: REGION_COLOR[region], flexShrink: 0 }} />
              <span style={{ flex: 1, color: "var(--muted)" }}>{REGION_LABEL[region]}</span>
              <strong style={{ color: v === null ? "var(--muted)" : "var(--ink)", fontSize: v === null ? 11 : 14 }}>{fmt(v)}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CertCard({ label, agency, value, icon, iconBg, iconColor }: {
  label: string; agency: string; value: number | null; icon: React.ReactNode; iconBg: string; iconColor: string;
}) {
  return (
    <section className="card" style={{ flex: "1 1 200px", minWidth: 200, display: "flex", flexDirection: "column" }}>
      <IconBadge icon={icon} bg={iconBg} color={iconColor} />
      <div className="stat-label" style={{ marginTop: 12 }}>{label}</div>
      <div className="stat-note" style={{ marginTop: 2 }}>{agency}</div>
      <div style={{ marginTop: "auto", paddingTop: 10 }}>
        <BigValue value={value} unit="คน" />
      </div>
    </section>
  );
}

export function OverviewCards({
  ov, pyramid, filters, onFilter,
}: {
  ov: Overview;
  pyramid: Pyramid;
  filters: DashFilters;
  onFilter: (dim: "region" | "type", value: string) => void;
}) {
  const onRegion = (r: string) => onFilter("region", r);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* แถวที่ 1: หน่วยฝึกอบรม + ผู้เรียน */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <CountCard label="จำนวนหน่วยฝึกอบรม" unit="แห่ง" total={ov.total_units} byRegion={ov.units_by_region}
          icon={<Building2 size={22} />} iconBg="#ede6fb" iconColor="#4a3aa7" onRegionClick={onRegion} activeRegion={filters.region} />
        <CountCard label="จำนวนผู้เรียน" unit="คน" total={ov.total_learners} byRegion={ov.learners_by_region}
          icon={<Users size={22} />} iconBg="#e5f0fc" iconColor="#2a78d6" onRegionClick={onRegion} activeRegion={filters.region} />
      </div>

      {/* แถวที่ 2: 3 มาตรฐาน */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <CertCard label="ผ่านการอบรมผู้สัมผัสอาหาร" agency="กรมอนามัย" value={ov.cert_anamai_contact}
          icon={<ShieldCheck size={22} />} iconBg="#e2f3e9" iconColor="#1baf7a" />
        <CertCard label="ประกาศนียบัตรสมรรถนะผู้ประกอบอาหารไทย ระดับ 4" agency="สถาบันคุณวุฒิวิชาชีพ (องค์การมหาชน)" value={ov.cert_professional_q}
          icon={<Award size={22} />} iconBg="#fbe6f0" iconColor="#d55181" />
        <CertCard label="มาตรฐานฝีมือแรงงานแห่งชาติ ผู้ประกอบอาหารไทย ระดับ 1" agency="กรมพัฒนาฝีมือแรงงาน" value={ov.cert_dsd_l1}
          icon={<Medal size={22} />} iconBg="#fdf0de" iconColor="#c98500" />
      </div>

      {/* แถวที่ 3: Donut ประเภทสถาบัน + Donut สถานะการเรียน */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <section className="card" style={{ flex: "1 1 420px", minWidth: 320 }}>
          <div className="stat-label" style={{ marginBottom: 16, fontWeight: 600 }}>ประเภทของสถาบัน (คลิกเพื่อกรอง)</div>
          <InstitutionDonut counts={ov.units_by_type} onTypeClick={(t) => onFilter("type", t)} activeType={filters.type} />
        </section>

        <section className="card" style={{ flex: "1 1 420px", minWidth: 320 }}>
          <div className="stat-label" style={{ marginBottom: 16, fontWeight: 600 }}>สถานะการเรียน</div>
          <DonutChart
            centerLabel="ผู้เรียน"
            // 3 states that partition total_learners (see get_dashboard_overview) so the centre total
            // reconciles with the "จำนวนผู้เรียน" headline. Empty categories are dropped.
            slices={[
              { key: "in_progress", label: "อยู่ระหว่างเรียน", value: ov.status_in_progress ?? 0, color: "#4a3aa7" },
              { key: "finished", label: "เรียนเสร็จแล้ว", value: ov.status_finished ?? 0, color: "#1baf7a" },
              { key: "withdrawn", label: "ถอนตัว", value: ov.status_withdrawn ?? 0, color: "#9aa3af" },
            ].filter((s) => s.value > 0)}
          />
        </section>
      </div>

      {/* แถวที่ 4: พีระมิดประชากรผู้เรียน */}
      <section className="card">
        <div className="stat-label" style={{ marginBottom: 16, fontWeight: 600 }}>พีระมิดประชากรผู้เรียน (อายุ × เพศ)</div>
        <PyramidChart data={pyramid} />
      </section>

      {/* แถวที่ 5: แผนที่ + หน่วยฝึกอบรมล่าสุด */}
      <MapSection pins={ov.pins} latestUnits={ov.latest_units} />
    </div>
  );
}
