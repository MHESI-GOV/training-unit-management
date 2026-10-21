"use client";

import { useActionState } from "react";
import { uploadAvatar, removeAvatar, type AvatarState } from "./actions";

const init: AvatarState = {};

export function AvatarUploader({
  avatarUrl,
  initial,
}: {
  avatarUrl: string | null;
  initial: string;
}) {
  const [state, action, pending] = useActionState(uploadAvatar, init);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="account-avatar" src={avatarUrl} alt="รูปโปรไฟล์" />
        ) : (
          <span className="account-avatar placeholder">{initial}</span>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          <form action={action} style={{ display: "grid", gap: 8 }}>
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png"
              required
              className="field"
            />
            <button type="submit" className="btn primary" disabled={pending} style={{ justifySelf: "start" }}>
              {pending ? "กำลังอัปโหลด..." : "อัปโหลดรูปใหม่"}
            </button>
          </form>
          {avatarUrl && (
            <form action={removeAvatar}>
              <button type="submit" className="btn secondary" style={{ justifySelf: "start" }}>
                ลบรูปโปรไฟล์
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="footnote">รองรับไฟล์ JPEG หรือ PNG ขนาดไม่เกิน 5MB</p>
      {state.error && <p className="notice error">{state.error}</p>}
      {state.success && <p className="notice success">อัปเดตรูปโปรไฟล์แล้ว</p>}
    </div>
  );
}
