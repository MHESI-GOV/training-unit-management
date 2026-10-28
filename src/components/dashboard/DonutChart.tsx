// A plain SVG donut + legend — no chart library, no client JS (pure render). Identity is never
// color-alone: every slice carries a direct label + value + % in the legend. Colors are supplied
// by the caller; callers should use the data-viz validated palette slots.
export type DonutSlice = { key: string; label: string; value: number; color: string };

export function DonutChart({
  slices,
  centerLabel,
  size = 180,
  stroke = 30,
  onSliceClick,
  activeKey,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  size?: number;
  stroke?: number;
  // When provided, each legend row becomes a click-to-filter control; activeKey highlights the
  // currently-selected one.
  onSliceClick?: (key: string) => void;
  activeKey?: string | null;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const arcs = slices.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const len = frac * circ;
    const seg = { s, dash: len, gap: circ - len, off: offset };
    offset -= len;
    return seg;
  });

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={centerLabel}
        style={{ flexShrink: 0 }}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        {total > 0 &&
          arcs.map(
            (a) =>
              a.s.value > 0 && (
                <circle
                  key={a.s.key}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={a.s.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${Math.max(a.dash - 2, 0)} ${a.gap + 2}`}
                  strokeDashoffset={a.off}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              ),
          )}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--ink)">
          {total.toLocaleString("th-TH")}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11" fill="var(--muted)">
          {centerLabel}
        </text>
      </svg>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12, flex: "1 1 200px", minWidth: 190 }}>
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 1000) / 10 : 0;
          const active = activeKey === s.key;
          const content = (
            <>
              <span
                aria-hidden
                style={{ width: 12, height: 12, borderRadius: 999, flexShrink: 0, background: s.color }}
              />
              <span style={{ flex: 1, fontSize: 14 }}>{s.label}</span>
              <strong style={{ fontSize: 16 }}>{s.value.toLocaleString("th-TH")}</strong>
              <span className="footnote" style={{ minWidth: 48, textAlign: "right" }}>
                {pct}%
              </span>
            </>
          );
          if (!onSliceClick) {
            return (
              <li key={s.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {content}
              </li>
            );
          }
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onSliceClick(s.key)}
                aria-pressed={active}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  border: active ? "1px solid #9ec3ee" : "1px solid transparent",
                  background: active ? "#eaf3fd" : "transparent", cursor: "pointer",
                  borderRadius: 8, padding: "4px 8px", color: "inherit", font: "inherit",
                }}
              >
                {content}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
