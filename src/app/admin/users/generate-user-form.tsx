"use client";

import { useActionState } from "react";
import { generateUser, type GenerateUserState } from "./actions";

const ROLE_OPTIONS = [
  { value: "central_staff", label: "Central Staff" },
  { value: "unit_coordinator", label: "Unit Coordinator" },
  { value: "executive", label: "Executive" },
];

const initialState: GenerateUserState = {};

export function GenerateUserForm() {
  const [state, formAction, pending] = useActionState(generateUser, initialState);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <form action={formAction} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <label>
          ชื่อผู้แทน
          <input name="display_name" required style={{ width: "100%" }} />
        </label>
        <label>
          อีเมล
          <input name="email" type="email" required style={{ width: "100%" }} />
        </label>
        <label>
          บทบาท
          <select name="role" required style={{ width: "100%" }}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "กำลังสร้าง..." : "สร้างบัญชี"}
        </button>
      </form>

      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}

      {state.result && (
        <div style={{ border: "1px solid #ccc", padding: 12, maxWidth: 480 }}>
          <p>สร้างบัญชีสำเร็จ: {state.result.email}</p>
          {state.result.emailSent ? (
            <p>ส่งอีเมลแจ้ง Username/Password ให้ผู้ใช้แล้ว</p>
          ) : (
            <>
              <p style={{ color: "darkorange" }}>
                ยังไม่ได้ตั้งค่าบริการส่งอีเมล (RESEND_API_KEY) — กรุณาส่งข้อมูลนี้ให้ผู้ใช้เองด้วยช่องทางอื่น:
              </p>
              <p>Username: {state.result.username}</p>
              <p>รหัสผ่านชั่วคราว: {state.result.temporaryPassword}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
