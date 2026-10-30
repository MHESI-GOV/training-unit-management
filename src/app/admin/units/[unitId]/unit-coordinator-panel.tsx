"use client";

import { useActionState } from "react";
import Link from "next/link";
import { assignCoordinatorToUnit, type AssignCoordState } from "@/app/admin/users/actions";

const initial: AssignCoordState = {};

export type UnscopedCoordinator = { id: string; label: string };

// WM-only panel on the unit data-sheet: shows who coordinates this unit, and if nobody does, lets
// the Web Master either generate a brand-new account bound to this unit (link to User Management)
// or assign an EXISTING unscoped coordinator account to it.
export function UnitCoordinatorPanel({
  unitId,
  coordinatorName,
  coordinatorEmail,
  unscoped,
}: {
  unitId: string;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  unscoped: UnscopedCoordinator[];
}) {
  const [state, action, pending] = useActionState(assignCoordinatorToUnit, initial);

  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700 }}>ผู้ดูแลหน่วย (Unit Coordinator)</h2>
      {coordinatorName ? (
        <p style={{ marginTop: 8 }}>
          <span className="pill done">{coordinatorName}</span>
          {coordinatorEmail && <span className="footnote"> · {coordinatorEmail}</span>}
        </p>
      ) : (
        <>
          <p className="footnote" style={{ marginTop: 8 }}>
            หน่วยนี้ยังไม่มีผู้ดูแล — มอบหมายบัญชีที่มีอยู่ หรือสร้างบัญชีใหม่ผูกกับหน่วยนี้
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
            <form action={action} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <input type="hidden" name="unit_id" value={unitId} />
              <label>
                <span className="field-label">มอบหมายบัญชีที่มีอยู่ (ยังไม่มีหน่วย)</span>
                <select name="user_id" required className="field" style={{ minWidth: 240 }} defaultValue="">
                  <option value="" disabled>
                    — เลือกบัญชี —
                  </option>
                  {unscoped.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn primary" disabled={pending || unscoped.length === 0}>
                {pending ? "กำลังมอบหมาย..." : "มอบหมาย"}
              </button>
            </form>
            <Link href="/admin/users" className="btn secondary">
              + สร้างบัญชีผู้ดูแลใหม่
            </Link>
          </div>
          {unscoped.length === 0 && (
            <p className="footnote" style={{ marginTop: 8 }}>
              ไม่มีบัญชีผู้ดูแลที่ว่างอยู่ — ไปที่ User Management เพื่อสร้างบัญชีใหม่ (เลือกผูกกับหน่วยนี้ได้เลย)
            </p>
          )}
          {state.error && <p className="notice error" style={{ marginTop: 10 }}>{state.error}</p>}
          {state.success && <p className="pill done" style={{ marginTop: 10 }}>{state.success}</p>}
        </>
      )}
    </section>
  );
}
