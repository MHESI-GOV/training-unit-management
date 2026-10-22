"use client";

import { useActionState, useEffect, useState } from "react";
import {
  adminChangeEmail,
  adminResetPassword,
  adminSetDisabled,
  type AdminEmailState,
  type AdminResetState,
  type AdminDisableState,
} from "./actions";

const emailInit: AdminEmailState = {};
const resetInit: AdminResetState = {};
const disableInit: AdminDisableState = {};

// Small centered popup used for each row action that needs input or shows output.
function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
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
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
          <button type="button" className="btn secondary" onClick={onClose} style={{ padding: "2px 10px" }}>
            ปิด
          </button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

export function AccountAdminActions({
  userId,
  currentEmail,
  disabled,
  canDisable,
}: {
  userId: string;
  currentEmail: string;
  disabled: boolean;
  canDisable: boolean;
}) {
  const [open, setOpen] = useState<null | "email" | "reset" | "disable">(null);
  const [emailState, emailAction, emailPending] = useActionState(adminChangeEmail, emailInit);
  const [resetState, resetAction, resetPending] = useActionState(adminResetPassword, resetInit);
  const [disableState, disableAction, disablePending] = useActionState(adminSetDisabled, disableInit);

  // Close the confirm dialogs automatically once the action reports success.
  useEffect(() => {
    if (emailState.success) setOpen(null);
  }, [emailState.success]);
  useEffect(() => {
    if (disableState.success) setOpen(null);
  }, [disableState.success]);

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <button type="button" className="btn secondary" onClick={() => setOpen("email")}>เปลี่ยนอีเมล</button>
      <button type="button" className="btn secondary" onClick={() => setOpen("reset")}>รีเซ็ตรหัสผ่าน</button>
      {canDisable && (
        <button
          type="button"
          className={`btn ${disabled ? "primary" : "danger"}`}
          onClick={() => setOpen("disable")}
        >
          {disabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        </button>
      )}

      {open === "email" && (
        <Dialog title="เปลี่ยนอีเมลเข้าระบบ" onClose={() => setOpen(null)}>
          <form action={emailAction} style={{ display: "grid", gap: 10 }}>
            <input type="hidden" name="user_id" value={userId} />
            <input name="email" type="email" required defaultValue={currentEmail} className="field" />
            <p className="footnote">ใช้เมื่อเปลี่ยนตัวผู้ประสานงาน (ส่งมอบหน่วยเดิม) — ข้อมูลหน่วยยังอยู่ครบ บัญชีเดิมเข้าด้วยอีเมลเก่าไม่ได้อีก</p>
            {emailState.error && <p className="notice error">{emailState.error}</p>}
            <button type="submit" className="btn primary" disabled={emailPending}>
              {emailPending ? "กำลังบันทึก..." : "ยืนยันเปลี่ยนอีเมล"}
            </button>
          </form>
        </Dialog>
      )}

      {open === "reset" && (
        <Dialog title="รีเซ็ตรหัสผ่าน" onClose={() => setOpen(null)}>
          {resetState.result ? (
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
          ) : (
            <form action={resetAction} style={{ display: "grid", gap: 10 }}>
              <input type="hidden" name="user_id" value={userId} />
              <p className="footnote">ตั้งรหัสผ่านชั่วคราวใหม่และบังคับให้ผู้ใช้เปลี่ยนรหัสเมื่อเข้าระบบครั้งถัดไป</p>
              {resetState.error && <p className="notice error">{resetState.error}</p>}
              <button type="submit" className="btn primary" disabled={resetPending}>
                {resetPending ? "กำลังรีเซ็ต..." : "ยืนยันรีเซ็ตรหัสผ่าน"}
              </button>
            </form>
          )}
        </Dialog>
      )}

      {open === "disable" && (
        <Dialog title={disabled ? "เปิดใช้งานบัญชี" : "ปิดใช้งานบัญชี"} onClose={() => setOpen(null)}>
          <form action={disableAction} style={{ display: "grid", gap: 10 }}>
            <input type="hidden" name="user_id" value={userId} />
            <input type="hidden" name="disabled" value={disabled ? "false" : "true"} />
            <p className="footnote">
              {disabled
                ? "เปิดให้บัญชีนี้กลับเข้าสู่ระบบได้อีกครั้ง"
                : "บัญชีนี้จะเข้าสู่ระบบไม่ได้ (ข้อมูลและประวัติยังอยู่ครบ สามารถเปิดใช้งานใหม่ภายหลังได้)"}
            </p>
            {disableState.error && <p className="notice error">{disableState.error}</p>}
            <button type="submit" className={`btn ${disabled ? "primary" : "danger"}`} disabled={disablePending}>
              {disablePending ? "กำลังดำเนินการ..." : disabled ? "ยืนยันเปิดใช้งาน" : "ยืนยันปิดใช้งาน"}
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
