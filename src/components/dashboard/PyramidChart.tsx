import { type Pyramid } from "@/lib/dashboard";

// Population pyramid (age × gender) — a classic two-sided bar chart: ชาย on the left, หญิง on the
// right, age bands stacked oldest-at-top. Pure render (no client JS). Gender has only 2 values
// (ชาย/หญิง). Identity is never colour-alone: each side is labelled and every bar shows its count.
const MALE = "#2a78d6";
const FEMALE = "#e87ba4";

export function PyramidChart({ data }: { data: Pyramid }) {
  // Oldest band at the top (DB returns ≤19 → 60+).
  const rows = [...data].reverse();
  const max = Math.max(1, ...rows.map((r) => Math.max(r.male, r.female)));
  const totalMale = data.reduce((s, r) => s + r.male, 0);
  const totalFemale = data.reduce((s, r) => s + r.female, 0);
  const grand = totalMale + totalFemale;

  if (grand === 0) {
    return <p className="footnote" style={{ margin: "8px 0" }}>ยังไม่มีข้อมูลวันเกิด/เพศของผู้เรียนมากพอจะแสดงผล</p>;
  }

  const pctMale = Math.round((totalMale / grand) * 1000) / 10;
  const pctFemale = Math.round((totalFemale / grand) * 1000) / 10;

  return (
    <div>
      {/* Fixed chart-area height (= the donut's svg size, 180px) and vertically centred, so this
          card's legend starts on the same line as the ศูนย์ทดสอบ donut's legend beside it. */}
      <div style={{ minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "grid", gap: 6 }}>
          {rows.map((r) => (
          <div key={r.band} style={{ display: "grid", gridTemplateColumns: "1fr 58px 1fr", alignItems: "center", gap: 6 }}>
            {/* left / male — bar grows leftward */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
              <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "var(--muted)" }}>{r.male.toLocaleString("th-TH")}</span>
              <div
                style={{ width: `${(r.male / max) * 100}%`, height: 16, background: MALE, borderRadius: "4px 0 0 4px", minWidth: r.male > 0 ? 3 : 0 }}
                aria-label={`ชาย อายุ ${r.band}: ${r.male} คน`}
              />
            </div>
            <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{r.band}</div>
            {/* right / female — bar grows rightward */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{ width: `${(r.female / max) * 100}%`, height: 16, background: FEMALE, borderRadius: "0 4px 4px 0", minWidth: r.female > 0 ? 3 : 0 }}
                aria-label={`หญิง อายุ ${r.band}: ${r.female} คน`}
              />
              <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "var(--muted)" }}>{r.female.toLocaleString("th-TH")}</span>
            </div>
          </div>
          ))}
        </div>
      </div>

      {/* legend — same layout + same start line as the ศูนย์ทดสอบ donut (18px gap under the chart) */}
      <ul style={{ listStyle: "none", padding: 0, margin: "18px auto 0", display: "grid", gap: 10, width: "100%", maxWidth: 340 }}>
        <li style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", border: "1px solid transparent" }}>
          <span aria-hidden style={{ width: 12, height: 12, borderRadius: 999, flexShrink: 0, background: MALE }} />
          <span style={{ flex: 1, fontSize: 14 }}>ชาย</span>
          <strong style={{ fontSize: 16 }}>{totalMale.toLocaleString("th-TH")}</strong>
          <span className="footnote" style={{ minWidth: 48, textAlign: "right" }}>{pctMale}%</span>
        </li>
        <li style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", border: "1px solid transparent" }}>
          <span aria-hidden style={{ width: 12, height: 12, borderRadius: 999, flexShrink: 0, background: FEMALE }} />
          <span style={{ flex: 1, fontSize: 14 }}>หญิง</span>
          <strong style={{ fontSize: 16 }}>{totalFemale.toLocaleString("th-TH")}</strong>
          <span className="footnote" style={{ minWidth: 48, textAlign: "right" }}>{pctFemale}%</span>
        </li>
      </ul>
    </div>
  );
}
