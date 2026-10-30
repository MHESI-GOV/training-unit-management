"use client";

import { useActionState, useState } from "react";
import { generateUser, type GenerateUserState } from "./actions";

const ROLE_OPTIONS = [
  { value: "central_staff", label: "Central Staff" },
  { value: "unit_coordinator", label: "Unit Coordinator" },
  { value: "executive", label: "Executive" },
];

const initialState: GenerateUserState = {};

export type AssignableUnit = { unit_id: string; label: string };

// `units` = units that currently have NO coordinator. When role = Unit Coordinator, the Web Master
// can optionally bind the new account to one of these existing units (round 12); leaving it blank
// keeps the old self-onboarding behavior. `defaultRole`/`defaultUnitId` let the unit data-sheet
// open this prefilled for "assign a coordinator to THIS unit".
export function GenerateUserForm({
  units = [],
  defaultRole = "central_staff",
  defaultUnitId = "",
  lockUnit = false,
}: {
  units?: AssignableUnit[];
  defaultRole?: string;
  defaultUnitId?: string;
  lockUnit?: boolean;
}) {
  const [state, formAction, pending] = useActionState(generateUser, initialState);
  const [role, setRole] = useState(defaultRole);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <form action={formAction} style={{ display: "grid", gap: 12 }}>
        <label>
          <span className="field-label">ชื่อหน่วยงาน</span>
          <input name="display_name" required className="field" />
        </label>
        <label>
          <span className="field-label">อีเมล</span>
          <input name="email" type="email" required className="field" />
        </label>
        <label>
          <span className="field-label">บทบาท</span>
          <select
            name="role"
            required
            className="field"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        {role === "unit_coordinator" &&
          (lockUnit && defaultUnitId ? (
            <input type="hidden" name="unit_id" value={defaultUnitId} />
          ) : (
            <label>
              <span className="field-label">มอบหมายให้หน่วย (ที่ยังไม่มีผู้ดูแล)</span>
              <select name="unit_id" defaultValue={defaultUnitId} className="field">
                <option value="">— ไม่ผูกตอนนี้ (ให้ผู้ดูแลสร้างหน่วยเอง) —</option>
                {units.map((u) => (
                  <option key={u.unit_id} value={u.unit_id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "กำลังสร้าง..." : "สร้างบัญชี"}
        </button>
      </form>

      {state.error && <p className="notice error">{state.error}</p>}

      {state.result && (
        <div className="card">
          <p className="pill done">สร้างบัญชีสำเร็จ: {state.result.email}</p>
          {state.result.emailSent ? (
            <p style={{ marginTop: 10 }}>ส่งอีเมลแจ้ง Username/Password ให้ผู้ใช้แล้ว</p>
          ) : (
            <>
              <p className="notice" style={{ background: "#fff3da", color: "#76520c", border: "1px solid #f0d9a6", marginTop: 10 }}>
                ยังไม่ได้ตั้งค่าบริการส่งอีเมล (GMAIL_USER/GMAIL_APP_PASSWORD) — กรุณาส่งข้อมูลนี้ให้ผู้ใช้เองด้วยช่องทางอื่น:
              </p>
              <p style={{ marginTop: 8 }}>Username: {state.result.username}</p>
              <p>รหัสผ่านชั่วคราว: {state.result.temporaryPassword}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
