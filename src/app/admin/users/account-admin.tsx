"use client";

import { useActionState, useState } from "react";
import {
  adminChangeEmail,
  adminResetPassword,
  type AdminEmailState,
  type AdminResetState,
} from "./actions";

const emailInit: AdminEmailState = {};
const resetInit: AdminResetState = {};

export function AccountAdminActions({
  userId,
  currentEmail,
}: {
  userId: string;
  currentEmail: string;
}) {
  const [emailState, emailAction, emailPending] = useActionState(adminChangeEmail, emailInit);
  const [resetState, resetAction, resetPending] = useActionState(adminResetPassword, resetInit);
  const [showEmail, setShowEmail] = useState(false);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn secondary" onClick={() => setShowEmail((v) => !v)}>
          เปลี่ยนอีเมล
        </button>
        <form action={resetAction}>
          <input type="hidden" name="user_id" value={userId} />
          <button type="submit" className="btn secondary" disabled={resetPending}>
            {resetPending ? "กำลังรีเซ็ต..." : "รีเซ็ตรหัสผ่าน"}
          </button>
        </form>
      </div>

      {showEmail && (
        <form action={emailAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input type="hidden" name="user_id" value={userId} />
          <input
            name="email"
            type="email"
            required
            defaultValue={currentEmail}
            className="field"
            style={{ maxWidth: 260 }}
          />
          <button type="submit" className="btn primary" disabled={emailPending}>
            {emailPending ? "กำลังบันทึก..." : "ยืนยัน"}
          </button>
        </form>
      )}

      {emailState.error && <p className="notice error">{emailState.error}</p>}
      {emailState.success && <p className="notice success">{emailState.success}</p>}

      {resetState.error && <p className="notice error">{resetState.error}</p>}
      {resetState.result && (
        <div className="notice" style={{ background: "#eef6ff", border: "1px solid #c8def7", color: "#1d4f82" }}>
          {resetState.result.emailSent ? (
            <>รีเซ็ตและส่งรหัสผ่านชั่วคราวไปที่ {resetState.result.email} แล้ว</>
          ) : (
            <>
              รีเซ็ตแล้ว (ยังไม่ได้ตั้งค่าอีเมล — แจ้งผู้ใช้เอง)
              <br />
              รหัสผ่านชั่วคราว: <strong>{resetState.result.temporaryPassword}</strong>
            </>
          )}
        </div>
      )}
    </div>
  );
}
