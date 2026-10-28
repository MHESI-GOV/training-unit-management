import { type Pyramid } from "@/lib/dashboard";

// Population pyramid (age × gender) — a classic two-sided bar chart: ชาย on the left, หญิง on the
// right, age bands stacked oldest-at-top. Pure render (no client JS). "เพศอื่นๆ" doesn't fit a
// two-sided pyramid so it's surfaced as a total line below. Identity is never colour-alone: each
// side is labelled and every bar shows its count.
const MALE = "#2a78d6";
const FEMALE = "#e87ba4";

export function PyramidChart({ data }: { data: Pyramid }) {
  // Oldest band at the top (DB returns ≤19 → 60+).
  const rows = [...data].reverse();
  const max = Math.max(1, ...rows.map((r) => Math.max(r.male, r.female)));
  const totalMale = data.reduce((s, r) => s + r.male, 0);
  const totalFemale = data.reduce((s, r) => s + r.female, 0);
  const totalOther = data.reduce((s, r) => s + r.other, 0);
  const grand = totalMale + totalFemale + totalOther;

  if (grand === 0) {
    return <p className="footnote" style={{ margin: "8px 0" }}>ยังไม่มีข้อมูลวันเกิด/เพศของผู้เรียนมากพอจะแสดงผล</p>;
  }

  return (
    <div>
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

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 14, fontSize: 13, alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <span aria-hidden style={{ width: 12, height: 12, borderRadius: 3, background: MALE }} />
          ชาย <strong>{totalMale.toLocaleString("th-TH")}</strong>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <span aria-hidden style={{ width: 12, height: 12, borderRadius: 3, background: FEMALE }} />
          หญิง <strong>{totalFemale.toLocaleString("th-TH")}</strong>
        </span>
        {totalOther > 0 && (
          <span className="footnote">เพศอื่นๆ {totalOther.toLocaleString("th-TH")} คน</span>
        )}
      </div>
    </div>
  );
}
