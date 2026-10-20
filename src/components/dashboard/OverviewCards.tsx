import { Building2, Users, ShieldCheck, Award, Medal } from "lucide-react";
import { InstitutionDonut } from "./InstitutionDonut";
import { DonutChart } from "./DonutChart";
import { MapSection } from "./MapSection";
import { REGION_ORDER, REGION_LABEL, REGION_COLOR } from "@/lib/labels";
import { type Overview, fmt } from "@/lib/dashboard";

// The shared Dashboard overview layout — the 5-card headline row + the 2-donut row — rendered
// identically on the authenticated dashboard (src/app/page.tsx) and the public Home
// (components/home/PublicHome.tsx). Per the user's standing instruction, any dashboard layout
// change lives here so BOTH pages change together (see memory feedback_dashboard_includes_home).
function IconBadge({ icon, bg, color }: { icon: React.ReactNode; bg: string; color: string }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
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
  label,
  unit,
  total,
  byRegion,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  unit: string;
  total: number | null;
  byRegion: Record<string, number | null>;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
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

      <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, margin: "16px 0 10px" }}>รายภูมิภาค</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 18px" }}>
        {REGION_ORDER.map((region) => {
          const v = byRegion[region];
          return (
            <div key={region} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span
                aria-hidden
                style={{ width: 10, height: 10, borderRadius: 999, background: REGION_COLOR[region], flexShrink: 0 }}
              />
              <span style={{ flex: 1, color: "var(--muted)" }}>{REGION_LABEL[region]}</span>
              <strong style={{ color: v === null ? "var(--muted)" : "var(--ink)", fontSize: v === null ? 11 : 14 }}>
                {fmt(v)}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CertCard({
  label,
  agency,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  agency: string;
  value: number | null;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <section className="card" style={{ flex: "1 1 200px", minWidth: 200, display: "flex", flexDirection: "column" }}>
      <IconBadge icon={icon} bg={iconBg} color={iconColor} />
      <div className="stat-label" style={{ marginTop: 12 }}>
        {label}
      </div>
      <div className="stat-note" style={{ marginTop: 2 }}>
        {agency}
      </div>
      <div style={{ marginTop: "auto", paddingTop: 10 }}>
        <BigValue value={value} unit="คน" />
      </div>
    </section>
  );
}

export function OverviewCards({ ov }: { ov: Overview }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* แถวที่ 1: หน่วยฝึกอบรม + ผู้เรียน (2 การ์ด) */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <CountCard
          label="จำนวนหน่วยฝึกอบรม"
          unit="แห่ง"
          total={ov.total_units}
          byRegion={ov.units_by_region}
          icon={<Building2 size={22} />}
          iconBg="#ede6fb"
          iconColor="#4a3aa7"
        />
        <CountCard
          label="จำนวนผู้เรียน"
          unit="คน"
          total={ov.total_learners}
          byRegion={ov.learners_by_region}
          icon={<Users size={22} />}
          iconBg="#e5f0fc"
          iconColor="#2a78d6"
        />
      </div>

      {/* แถวที่ 2: 3 มาตรฐาน (แถวเดียว) */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <CertCard
          label="ผ่านการอบรมผู้สัมผัสอาหาร"
          agency="กรมอนามัย"
          value={ov.cert_anamai_contact}
          icon={<ShieldCheck size={22} />}
          iconBg="#e2f3e9"
          iconColor="#1baf7a"
        />
        <CertCard
          label="ประกาศนียบัตรสมรรถนะผู้ประกอบอาหารไทย ระดับ 4"
          agency="สถาบันคุณวุฒิวิชาชีพ (องค์การมหาชน)"
          value={ov.cert_professional_q}
          icon={<Award size={22} />}
          iconBg="#fbe6f0"
          iconColor="#d55181"
        />
        <CertCard
          label="มาตรฐานฝีมือแรงงานแห่งชาติ ผู้ประกอบอาหารไทย ระดับ 1"
          agency="กรมพัฒนาฝีมือแรงงาน"
          value={ov.cert_dsd_l1}
          icon={<Medal size={22} />}
          iconBg="#fdf0de"
          iconColor="#c98500"
        />
      </div>

      {/* แถวที่ 2: Donut ประเภทสถาบัน + Donut สถานะการเรียน */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <section className="card" style={{ flex: "1 1 420px", minWidth: 320 }}>
          <div className="stat-label" style={{ marginBottom: 16, fontWeight: 600 }}>
            ประเภทของสถาบัน
          </div>
          <InstitutionDonut counts={ov.units_by_type} />
        </section>

        <section className="card" style={{ flex: "1 1 420px", minWidth: 320 }}>
          <div className="stat-label" style={{ marginBottom: 16, fontWeight: 600 }}>
            สถานะการเรียน
          </div>
          <DonutChart
            centerLabel="ผู้เรียน"
            slices={[
              { key: "completed", label: "สำเร็จการศึกษาแล้ว", value: ov.status_completed ?? 0, color: "#1baf7a" },
              { key: "in_progress", label: "อยู่ระหว่างการเรียน", value: ov.status_in_progress ?? 0, color: "#4a3aa7" },
            ]}
          />
        </section>
      </div>

      {/* แถวที่ 3: แผนที่การกระจายตัว + หน่วยฝึกอบรมล่าสุด */}
      <MapSection pins={ov.pins} latestUnits={ov.latest_units} />
    </div>
  );
}
