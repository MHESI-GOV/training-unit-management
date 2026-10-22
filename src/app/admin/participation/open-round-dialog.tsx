"use client";

import { useActionState, useEffect, useState } from "react";
import { openRound, type OpenRoundState } from "./actions";

const init: OpenRoundState = {};

export function OpenRoundDialog({ defaultFiscalYear }: { defaultFiscalYear: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(openRound, init);

  // Close the dialog automatically once a round is created successfully.
  useEffect(() => {
    if (state.result) setOpen(false);
  }, [state.result]);

  return (
    <>
      <button type="button" className="btn primary" onClick={() => setOpen(true)}>
        + เปิดรอบปีงบใหม่
      </button>

      {state.result && (
        <p className="notice success" style={{ marginTop: 10 }}>
          เปิดรอบ {state.result.fiscalYear} แล้ว — เชิญ {state.result.invited} หน่วย
          {state.result.emailTotal > 0
            ? ` · ส่งอีเมล ${state.result.emailsSent}/${state.result.emailTotal}`
            : " (ยังไม่ได้ตั้งค่าอีเมล — ใช้การแจ้งในแอป)"}
        </p>
      )}

      {open && (
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(23, 44, 72, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 100,
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 440 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>เปิดรอบปีงบประมาณใหม่</h2>
            <p className="footnote" style={{ marginTop: 4 }}>
              ระบบจะส่งคำเชิญยืนยันการเข้าร่วมไปยังทุกหน่วยฝึกที่มีอยู่
            </p>
            <form action={formAction} style={{ display: "grid", gap: 12, marginTop: 14 }}>
              <label>
                <span className="field-label">ปีงบประมาณ (พ.ศ.)</span>
                <input
                  name="fiscal_year"
                  type="number"
                  required
                  defaultValue={defaultFiscalYear}
                  className="field"
                />
              </label>
              <label>
                <span className="field-label">กำหนดยืนยันภายใน (ไม่บังคับ)</span>
                <input name="deadline" type="date" className="field" />
              </label>
              <label>
                <span className="field-label">ข้อความแจ้ง (ไม่บังคับ)</span>
                <textarea name="notice_message" rows={3} className="field" />
              </label>
              {state.error && <p className="notice error">{state.error}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn secondary" onClick={() => setOpen(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn primary" disabled={pending}>
                  {pending ? "กำลังเปิดรอบ..." : "เปิดรอบ + ส่ง Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
