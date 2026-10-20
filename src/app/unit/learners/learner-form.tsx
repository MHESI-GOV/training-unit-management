"use client";

import { useActionState } from "react";
import { createLearner, type LearnerFormState } from "./actions";

const initialState: LearnerFormState = {};

export function LearnerForm({ unitId }: { unitId: string }) {
  const [state, formAction, pending] = useActionState(createLearner, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      <label>
        <span className="field-label">ชื่อ</span>
        <input name="first_name" required className="field" />
      </label>
      <label>
        <span className="field-label">นามสกุล</span>
        <input name="last_name" required className="field" />
      </label>
      <label>
        <span className="field-label">เลขบัตรประชาชน (13 หลัก)</span>
        <input name="national_id" inputMode="numeric" pattern="\d{13}" required className="field" />
      </label>
      <label>
        <span className="field-label">เบอร์โทร</span>
        <input name="phone" className="field" />
      </label>
      <label>
        <span className="field-label">อีเมล</span>
        <input name="email" type="email" className="field" />
      </label>
      <label>
        <span className="field-label">ที่อยู่</span>
        <textarea name="address" className="field" rows={2} />
      </label>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "เพิ่มผู้เรียน"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}
