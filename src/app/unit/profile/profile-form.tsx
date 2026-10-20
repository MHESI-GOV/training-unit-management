"use client";

import { useActionState } from "react";
import { upsertUnitProfile, type ProfileFormState } from "./actions";

type Props = {
  unitId: string;
  initial: {
    address: string | null;
    phone: string | null;
    email: string | null;
    coordinator_name: string | null;
    description: string | null;
  } | null;
};

const initialState: ProfileFormState = {};

export function ProfileForm({ unitId, initial }: Props) {
  const [state, formAction, pending] = useActionState(upsertUnitProfile, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      <label>
        <span className="field-label">ชื่อผู้ประสานงาน</span>
        <input name="coordinator_name" defaultValue={initial?.coordinator_name ?? ""} className="field" />
      </label>
      <label>
        <span className="field-label">เบอร์โทร</span>
        <input name="phone" defaultValue={initial?.phone ?? ""} className="field" />
      </label>
      <label>
        <span className="field-label">อีเมลติดต่อ</span>
        <input name="email" type="email" defaultValue={initial?.email ?? ""} className="field" />
      </label>
      <label>
        <span className="field-label">ที่อยู่</span>
        <textarea name="address" defaultValue={initial?.address ?? ""} className="field" rows={2} />
      </label>
      <label>
        <span className="field-label">คำอธิบายหน่วย</span>
        <textarea name="description" defaultValue={initial?.description ?? ""} className="field" rows={2} />
      </label>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
      {state.success && <p className="notice success">บันทึกแล้ว</p>}
    </form>
  );
}
