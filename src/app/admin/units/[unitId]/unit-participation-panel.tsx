"use client";

import { useActionState } from "react";
import { adminConfirmParticipation, type ConfirmParticipationState } from "../actions";

const initial: ConfirmParticipationState = {};

// WM-only panel: record a unit's participation for a fiscal year (BE). Needed for historical units
// so the class-creation gate (confirmed participation) passes. Shows years already confirmed.
export function UnitParticipationPanel({
  unitId,
  confirmedYears,
  defaultFiscalYear,
}: {
  unitId: string;
  confirmedYears: number[];
  defaultFiscalYear: number;
}) {
  const [state, action, pending] = useActionState(adminConfirmParticipation, initial);

  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700 }}>การเข้าร่วมรายปีงบประมาณ</h2>
      <p style={{ marginTop: 8 }}>
        {confirmedYears.length > 0 ? (
          confirmedYears.map((y) => (
            <span key={y} className="pill done" style={{ marginRight: 6 }}>
              ปีงบ {y}
            </span>
          ))
        ) : (
          <span className="footnote">ยังไม่มีปีงบที่ยืนยันเข้าร่วม — เจ้าหน้าที่สร้างชั้นเรียนได้เลยโดยระบุปีงบในหน้าสร้างชั้นเรียน (ระบบจะบันทึกการเข้าร่วมให้อัตโนมัติ) หรือจะบันทึกไว้ล่วงหน้าที่นี่ก็ได้</span>
        )}
      </p>
      <form action={action} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 12 }}>
        <input type="hidden" name="unit_id" value={unitId} />
        <label>
          <span className="field-label">บันทึกการเข้าร่วม (ปีงบ พ.ศ.)</span>
          <input
            name="fiscal_year"
            type="number"
            required
            min={2500}
            max={2700}
            defaultValue={defaultFiscalYear}
            className="field"
            style={{ maxWidth: 140 }}
          />
        </label>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "กำลังบันทึก..." : "บันทึกการเข้าร่วม"}
        </button>
      </form>
      {state.error && <p className="notice error" style={{ marginTop: 10 }}>{state.error}</p>}
      {state.success && <p className="pill done" style={{ marginTop: 10 }}>{state.success}</p>}
    </section>
  );
}
