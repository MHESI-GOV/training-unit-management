"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// ตัวเลือกปีงบประมาณด้านบน dashboard/Home (ชิดซ้าย). เป็น controlled component — เจ้าของ
// (OverviewSection) จัดการค่า `selected` + `onChange` (ดึงข้อมูลใหม่แบบ client-side ไม่โหลดหน้าใหม่).
// ปกติ: ปุ่มน้ำเงินทึบ ตัวอักษร/chevron ขาว. ตอน active (โฟกัส/เปิด dropdown): พื้นขาว ตัวอักษร
// น้ำเงิน ขอบน้ำเงิน. Options แสดงแค่เลขปี — label "ปีงบประมาณ" อยู่นอกปุ่มแล้ว ไม่ต้องซ้ำ.
export function YearFilter({
  years,
  selected,
  onChange,
}: {
  years: number[];
  selected: string;
  onChange: (value: string) => void;
}) {
  const [active, setActive] = useState(false);

  const accent = "#fff";
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>ปีงบประมาณ</span>

      <div style={{ position: "relative", display: "inline-flex" }}>
        <select
          aria-label="เลือกปีงบประมาณ"
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setActive(true)}
          onBlur={() => setActive(false)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            background: active ? "#fff" : "var(--blue)",
            border: active ? "2px solid var(--blue)" : "2px solid var(--blue)",
            borderRadius: 8,
            color: active ? "var(--blue)" : "#fff",
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1.2,
            padding: "9px 44px 9px 18px",
            minWidth: 150,
            cursor: "pointer",
            outline: "none",
            boxShadow: "0 1px 2px rgba(16,16,40,.12)",
          }}
        >
          <option value="all" style={{ color: "var(--ink)" }}>
            ทุกปี
          </option>
          {years.map((y) => (
            <option key={y} value={String(y)} style={{ color: "var(--ink)" }}>
              {y}
            </option>
          ))}
        </select>
        <ChevronDown
          size={20}
          strokeWidth={2.4}
          color={active ? "var(--blue)" : accent}
          style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
      </div>
    </div>
  );
}
