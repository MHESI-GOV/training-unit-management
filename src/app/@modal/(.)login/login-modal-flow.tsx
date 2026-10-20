"use client";

import { useActionState } from "react";
import { signInCheckMfa, type SignInMfaState } from "@/app/login/actions";
import { EnrollClient } from "@/app/mfa/enroll/enroll-client";
import { VerifyForm } from "@/app/mfa/verify/verify-form";
import { AuthCard } from "@/components/layout/AuthCard";
import { CancelBackButton } from "@/components/layout/CancelBackButton";

const initialState: SignInMfaState = {};

// The whole login -> (Web Master only) MFA sequence as one continuous client-side flow inside
// a single popup instance -- no navigation between steps, so there's nothing for the
// intercepting-route mechanism to fail to re-intercept. See the long comment on
// signInCheckMfa() in src/app/login/actions.ts for why this exists instead of just letting
// signIn() redirect like the full page does.
export function LoginModalFlow() {
  const [state, formAction, pending] = useActionState(signInCheckMfa, initialState);

  if (state.step === "mfa-enroll") {
    return (
      <AuthCard title="ตั้งค่า MFA" subtitle="บัญชี Web Master ต้องเปิดใช้งาน MFA ก่อนจึงจะใช้งานระบบต่อได้">
        <EnrollClient />
      </AuthCard>
    );
  }

  if (state.step === "mfa-verify" && state.factorId) {
    return (
      <AuthCard title="ยืนยันตัวตนสองชั้น" subtitle="กรอกรหัสจากแอป Authenticator เพื่อเข้าสู่ระบบ">
        <VerifyForm factorId={state.factorId} />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="เข้าสู่ระบบ" subtitle="ระบบจัดการหน่วยฝึกอบรม">
      {state.error && <p className="notice error">เข้าสู่ระบบไม่สำเร็จ: {state.error}</p>}
      <form action={formAction} style={{ display: "grid", gap: 14 }}>
        <label>
          <span className="field-label">อีเมล</span>
          <input name="email" type="email" required className="field" />
        </label>
        <label>
          <span className="field-label">รหัสผ่าน</span>
          <input name="password" type="password" required className="field" />
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={pending}>
            {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          <CancelBackButton />
        </div>
      </form>
    </AuthCard>
  );
}
