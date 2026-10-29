"use client";

import { Popup } from "./Popup";

// Reusable "confirm before an action" modal — replaces the old inline two-step (armed) confirm
// buttons app-wide. Shows the warning message + a ยืนยัน / ยกเลิก choice. Result messages
// (success/error) stay as inline notices; this is only for the pre-action confirmation.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Popup open={open} onClose={pending ? () => {} : onCancel} title={title}>
      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </button>
          <button type="button" className={`btn ${danger ? "danger" : "primary"}`} onClick={onConfirm} disabled={pending}>
            {pending ? "กำลังดำเนินการ..." : confirmLabel}
          </button>
        </div>
      </div>
    </Popup>
  );
}
