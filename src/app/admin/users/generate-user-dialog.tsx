"use client";

import { useState } from "react";
import { GenerateUserForm, type AssignableUnit } from "./generate-user-form";

// "+ สร้างบัญชีใหม่" opens the Generate User form in a popup instead of showing it inline. The
// modal stays open after a successful create so the on-screen temp password (when email isn't
// configured) remains visible until the Web Master dismisses it. `units` = units without a
// coordinator, offered when role = Unit Coordinator (round 12).
export function GenerateUserDialog({ units = [] }: { units?: AssignableUnit[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn primary" onClick={() => setOpen(true)}>
        + สร้างบัญชีใหม่
      </button>

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
            zIndex: 200,
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>สร้างบัญชีใหม่ (Generate User)</h2>
              <button type="button" className="btn secondary" onClick={() => setOpen(false)} style={{ padding: "2px 10px" }}>
                ปิด
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              <GenerateUserForm units={units} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
