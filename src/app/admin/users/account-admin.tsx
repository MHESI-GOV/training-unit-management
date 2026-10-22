"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, KeyRound } from "lucide-react";
import {
  adminChangeEmail,
  adminChangeName,
  adminResetPassword,
  adminSetDisabled,
  type AdminEmailState,
  type AdminNameState,
  type AdminResetState,
  type AdminDisableState,
} from "./actions";
import { ROLE_LABEL } from "@/lib/labels";

const emailInit: AdminEmailState = {};
const nameInit: AdminNameState = {};
const resetInit: AdminResetState = {};
const disableInit: AdminDisableState = {};

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
          <button type="button" className="btn secondary" onClick={onClose} style={{ padding: "2px 10px" }}>ปิด</button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

// A small pencil button placed right after a field's value, in that field's own column.
function EditPencil({ tip, onClick }: { tip: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="icon-btn"
      data-tip={tip}
      onClick={onClick}
      style={{ width: 26, height: 26, marginLeft: 8, verticalAlign: "middle" }}
    >
      <Pencil size={13} />
    </button>
  );
}

const cell: React.CSSProperties = { padding: "10px", verticalAlign: "middle" };

export function AccountRow({
  userId,
  name,
  email,
  roleRaw,
  disabled,
  isSelf,
}: {
  userId: string;
  name: string;
  email: string;
  roleRaw: string;
  disabled: boolean;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState<null | "name" | "email" | "status" | "reset">(null);
  const [emailState, emailAction, emailPending] = useActionState(adminChangeEmail, emailInit);
  const [nameState, nameAction, namePending] = useActionState(adminChangeName, nameInit);
  const [resetState, resetAction, resetPending] = useActionState(adminResetPassword, resetInit);
  const [disableState, disableAction, disablePending] = useActionState(adminSetDisabled, disableInit);

  useEffect(() => {
    if (emailState.success) setOpen(null);
  }, [emailState.success]);
  useEffect(() => {
    if (nameState.success) setOpen(null);
  }, [nameState.success]);
  useEffect(() => {
    if (disableState.success) setOpen(null);
  }, [disableState.success]);

  const canDisable = !isSelf && roleRaw !== "web_master";

  return (
    <tr style={{ borderBottom: "1px solid var(--line)" }}>
      <td style={{ ...cell, fontWeight: 600 }}>
        {name}
        {!isSelf && <EditPencil tip="แก้ชื่อหน่วยงาน" onClick={() => setOpen("name")} />}
      </td>

      <td style={cell} className="footnote">
        {email}
        {!isSelf && <EditPencil tip="เปลี่ยนอีเมลเข้าระบบ" onClick={() => setOpen("email")} />}
      </td>

      <td style={cell}>
        <span className={`pill ${disabled ? "muted" : "done"}`}>{disabled ? "ปิดใช้งาน" : "ใช้งานอยู่"}</span>
        {canDisable && <EditPencil tip={disabled ? "เปิดใช้งานบัญชี" : "ปิดใช้งานบัญชี"} onClick={() => setOpen("status")} />}
      </td>

      <td style={cell}>{ROLE_LABEL[roleRaw] ?? roleRaw}</td>

      <td style={{ ...cell, textAlign: "right" }}>
        {isSelf ? (
          <span className="footnote">บัญชีของคุณ</span>
        ) : (
          <button type="button" className="icon-btn" data-tip="รีเซ็ตรหัสผ่าน" onClick={() => setOpen("reset")} style={{ width: 30, height: 30 }}>
            <KeyRound size={15} />
          </button>
        )}

        {open === "name" && (
          <Dialog title="แก้ชื่อหน่วยงาน" onClose={() => setOpen(null)}>
            <form action={nameAction} style={{ display: "grid", gap: 10, textAlign: "left" }}>
              <input type="hidden" name="user_id" value={userId} />
              <input name="display_name" required defaultValue={name} className="field" />
              {nameState.error && <p className="notice error">{nameState.error}</p>}
              <button type="submit" className="btn primary" disabled={namePending}>
                {namePending ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </form>
          </Dialog>
        )}

        {open === "email" && (
          <Dialog title="เปลี่ยนอีเมลเข้าระบบ" onClose={() => setOpen(null)}>
            <form action={emailAction} style={{ display: "grid", gap: 10, textAlign: "left" }}>
              <input type="hidden" name="user_id" value={userId} />
              <input name="email" type="email" required defaultValue={email} className="field" />
              <p className="footnote">ใช้เมื่อเปลี่ยนตัวผู้ประสานงาน (ส่งมอบหน่วยเดิม) — ข้อมูลหน่วยยังอยู่ครบ บัญชีเดิมเข้าด้วยอีเมลเก่าไม่ได้อีก</p>
              {emailState.error && <p className="notice error">{emailState.error}</p>}
              <button type="submit" className="btn primary" disabled={emailPending}>
                {emailPending ? "กำลังบันทึก..." : "ยืนยันเปลี่ยนอีเมล"}
              </button>
            </form>
          </Dialog>
        )}

        {open === "status" && (
          <Dialog title={disabled ? "เปิดใช้งานบัญชี" : "ปิดใช้งานบัญชี"} onClose={() => setOpen(null)}>
            <form action={disableAction} style={{ display: "grid", gap: 10, textAlign: "left" }}>
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

        {open === "reset" && (
          <Dialog title="รีเซ็ตรหัสผ่าน" onClose={() => setOpen(null)}>
            {resetState.result ? (
              <div className="notice" style={{ background: "#eef6ff", border: "1px solid #c8def7", color: "#1d4f82", textAlign: "left" }}>
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
              <form action={resetAction} style={{ display: "grid", gap: 10, textAlign: "left" }}>
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
      </td>
    </tr>
  );
}
