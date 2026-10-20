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
    <form action={formAction} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      <label>
        ชื่อผู้ประสานงาน
        <input name="coordinator_name" defaultValue={initial?.coordinator_name ?? ""} style={{ width: "100%" }} />
      </label>
      <label>
        เบอร์โทร
        <input name="phone" defaultValue={initial?.phone ?? ""} style={{ width: "100%" }} />
      </label>
      <label>
        อีเมลติดต่อ
        <input name="email" type="email" defaultValue={initial?.email ?? ""} style={{ width: "100%" }} />
      </label>
      <label>
        ที่อยู่
        <textarea name="address" defaultValue={initial?.address ?? ""} style={{ width: "100%" }} />
      </label>
      <label>
        คำอธิบายหน่วย
        <textarea name="description" defaultValue={initial?.description ?? ""} style={{ width: "100%" }} />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
      {state.success && <p style={{ color: "green" }}>บันทึกแล้ว</p>}
    </form>
  );
}
