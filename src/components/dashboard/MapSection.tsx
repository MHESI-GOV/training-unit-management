"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { REGION_ORDER, REGION_LABEL, REGION_COLOR, UNIT_TYPE_LABEL } from "@/lib/labels";
import type { Pin } from "./UnitMapInner";

const selectStyle: React.CSSProperties = { width: "auto", padding: "6px 10px" };

// The Leaflet map is loaded client-only (it touches window at import). A plain placeholder keeps
// layout stable until it mounts.
const UnitMapInner = dynamic(() => import("./UnitMapInner"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 460,
        borderRadius: 12,
        background: "var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted)",
        fontSize: 14,
      }}
    >
      กำลังโหลดแผนที่…
    </div>
  ),
});

type LatestUnit = { unit_id: string; name: string; region: string; type: string; status: string };

export function MapSection({ pins, latestUnits }: { pins: Pin[]; latestUnits: LatestUnit[] }) {
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");

  // Province options = the distinct provinces actually present among the pins (sorted Thai).
  const provinceOptions = useMemo(
    () => Array.from(new Set(pins.map((p) => p.province).filter((x): x is string => !!x))).sort((a, b) => a.localeCompare(b, "th")),
    [pins],
  );

  const filtered = useMemo(
    () =>
      pins.filter(
        (p) =>
          (!region || p.region === region) &&
          (!province || p.province === province) &&
          (!type || p.type === type) &&
          (!q || p.name.toLowerCase().includes(q.toLowerCase())),
      ),
    [pins, region, province, type, q],
  );

  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      {/* แผนที่ */}
      <section className="card" style={{ flex: "2 1 560px", minWidth: 320 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div className="stat-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 220 }}>
            <MapPin size={18} style={{ color: "var(--blue)" }} />
            การกระจายตัวของหน่วยฝึกอบรม
          </div>
          <span className="pill study" style={{ whiteSpace: "nowrap" }}>
            พบ {filtered.length.toLocaleString("th-TH")} หน่วย
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="field" style={selectStyle}>
            <option value="">ทุกภูมิภาค</option>
            {REGION_ORDER.map((r) => (
              <option key={r} value={r}>
                {REGION_LABEL[r]}
              </option>
            ))}
          </select>
          <select value={province} onChange={(e) => setProvince(e.target.value)} className="field" style={selectStyle}>
            <option value="">ทุกจังหวัด</option>
            {provinceOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="field" style={selectStyle}>
            <option value="">ทุกประเภทสถาบัน</option>
            {Object.entries(UNIT_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--muted)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อหน่วยฝึกอบรม…"
              className="field"
              style={{ width: 200, padding: "6px 10px 6px 30px" }}
            />
          </div>
        </div>

        {/* legend ภูมิภาค */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: 12 }}>
          {REGION_ORDER.map((r) => (
            <span key={r} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: REGION_COLOR[r] }} />
              {REGION_LABEL[r]}
            </span>
          ))}
        </div>

        <UnitMapInner pins={filtered} />
        <div className="footnote" style={{ marginTop: 10 }}>
          แสดง {filtered.length.toLocaleString("th-TH")} หน่วยที่ระบุพิกัดแล้ว
          {pins.length !== filtered.length ? ` (จากทั้งหมด ${pins.length.toLocaleString("th-TH")})` : ""}
        </div>
      </section>

      {/* หน่วยฝึกอบรมล่าสุด */}
      <section className="card" style={{ flex: "1 1 280px", minWidth: 260 }}>
        <div className="stat-label" style={{ fontWeight: 600, marginBottom: 14 }}>
          หน่วยฝึกอบรมล่าสุด
        </div>
        {latestUnits.length === 0 ? (
          <p className="footnote">ยังไม่มีหน่วยฝึกอบรม</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {latestUnits.map((u) => (
              <li key={u.unit_id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <MapPin size={16} style={{ color: REGION_COLOR[u.region] ?? "var(--muted)", marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{u.name}</div>
                  <div className="footnote">
                    {REGION_LABEL[u.region] ?? u.region} · {UNIT_TYPE_LABEL[u.type] ?? u.type}
                  </div>
                </div>
                <span className="pill done" style={{ flexShrink: 0 }}>
                  {u.status === "active" ? "เปิดดำเนินการ" : "ปิด"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
