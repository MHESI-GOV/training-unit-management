"use client";

import { useActionState } from "react";
import { PasswordField } from "@/components/ui/PasswordField";
import {
  changePassword,
  requestEmailChange,
  type ChangePasswordState,
  type EmailRequestState,
} from "./actions";

const pwInit: ChangePasswordState = {};
const emailInit: EmailRequestState = {};

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, pwInit);

  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <label>
        <span className="field-label">รหัสผ่านปัจจุบัน</span>
        <PasswordField name="current_password" required autoComplete="current-password" />
      </label>
      <label>
        <span className="field-label">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</span>
        <PasswordField name="new_password" required minLength={8} autoComplete="new-password" />
      </label>
      <label>
        <span className="field-label">ยืนยันรหัสผ่านใหม่</span>
        <PasswordField name="confirm_password" required minLength={8} autoComplete="new-password" />
      </label>
      <div>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
        </button>
      </div>
      {state.error && <p className="notice error">{state.error}</p>}
      {state.success && <p className="notice success">เปลี่ยนรหัสผ่านเรียบร้อยแล้ว</p>}
    </form>
  );
}

export function EmailChangeForm({ currentEmail }: { currentEmail: string | null }) {
  const [state, action, pending] = useActionState(requestEmailChange, emailInit);

  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <p className="footnote">
        อีเมลสำหรับเข้าสู่ระบบปัจจุบัน: <strong>{currentEmail ?? "-"}</strong>
      </p>
      <label>
        <span className="field-label">อีเมลใหม่ที่ต้องการใช้เข้าสู่ระบบ</span>
        <input name="requested_email" type="email" required className="field" autoComplete="email" />
      </label>
      <p className="footnote">
        คำขอนี้จะถูกส่งให้ผู้ดูแลระบบสูงสุด (Web Master) ตรวจสอบและอนุมัติก่อน จึงจะเปลี่ยนอีเมลเข้าระบบจริง
        (นี่คือ &quot;อีเมลสำหรับเข้าสู่ระบบ&quot; ไม่ใช่อีเมลติดต่อของหน่วยในหน้าโปรไฟล์)
      </p>
      <div>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "กำลังส่งคำขอ..." : "ส่งคำขอเปลี่ยนอีเมล"}
        </button>
      </div>
      {state.error && <p className="notice error">{state.error}</p>}
      {state.success && <p className="notice success">ส่งคำขอแล้ว รอผู้ดูแลระบบอนุมัติ</p>}
    </form>
  );
}
