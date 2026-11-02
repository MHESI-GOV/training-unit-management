"use client";

import { useState } from "react";
import type { ConfirmedRound } from "@/lib/participation";

// Staff picks the fiscal year for new classes from the rounds Web Master has opened (latest first,
// preselected). Controlled so a failed submit doesn't silently switch the year back to the default.
export function OpenedRoundSelect({ rounds }: { rounds: ConfirmedRound[] }) {
  const [year, setYear] = useState(rounds[0]?.fiscal_year ?? "");
  return (
    <label>
      <span className="field-label">ปีงบประมาณ (รอบที่ Web Master เปิด) *</span>
      <select name="fiscal_year" required value={year} onChange={(e) => setYear(Number(e.target.value))} className="field">
        {rounds.map((r) => (
          <option key={r.round_id} value={r.fiscal_year}>ปีงบประมาณ {r.fiscal_year}</option>
        ))}
      </select>
      <span className="footnote" style={{ display: "block", marginTop: 4 }}>
        ระบบจะบันทึกการเข้าร่วมปีงบนี้ให้หน่วยอัตโนมัติ
      </span>
    </label>
  );
}
