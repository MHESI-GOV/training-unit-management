"use client";

import { useActionState } from "react";
import { createLearner, type LearnerFormState } from "./actions";

const initialState: LearnerFormState = {};

export function LearnerForm({ unitId }: { unitId: string }) {
  const [state, formAction, pending] = useActionState(createLearner, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      <label>
        ชื่อ
        <input name="first_name" required style={{ width: "100%" }} />
      </label>
      <label>
        นามสกุล
        <input name="last_name" required style={{ width: "100%" }} />
      </label>
      <label>
        เลขบัตรประชาชน (13 หลัก)
        <input name="national_id" inputMode="numeric" pattern="\d{13}" required style={{ width: "100%" }} />
      </label>
      <label>
        เบอร์โทร
        <input name="phone" style={{ width: "100%" }} />
      </label>
      <label>
        อีเมล
        <input name="email" type="email" style={{ width: "100%" }} />
      </label>
      <label>
        ที่อยู่
        <textarea name="address" style={{ width: "100%" }} />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "เพิ่มผู้เรียน"}
      </button>
      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
    </form>
  );
}
