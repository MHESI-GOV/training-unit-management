"use client";

import { useActionState, useEffect, useRef } from "react";
import { createLearner, type LearnerFormState } from "./actions";

const initialState: LearnerFormState = {};

export function LearnerForm({ unitId, classId }: { unitId: string; classId?: string }) {
  const [state, formAction, pending] = useActionState(createLearner, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form after a successful save so the next learner can be entered immediately.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      {classId && <input type="hidden" name="class_id" value={classId} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">ชื่อ</span>
          <input name="first_name" required className="field" />
        </label>
        <label>
          <span className="field-label">นามสกุล</span>
          <input name="last_name" required className="field" />
        </label>
      </div>
      <label>
        <span className="field-label">เลขบัตรประชาชน (13 หลัก)</span>
        <input name="national_id" inputMode="numeric" pattern="\d{13}" required className="field" />
      </label>
      <label>
        <span className="field-label">วันเกิด (ใช้คำนวณอายุ)</span>
        <input name="birth_date" type="date" className="field" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">เบอร์โทร</span>
          <input name="phone" className="field" />
        </label>
        <label>
          <span className="field-label">อีเมล</span>
          <input name="email" type="email" className="field" />
        </label>
      </div>
      <label>
        <span className="field-label">ที่อยู่</span>
        <textarea name="address" className="field" rows={2} />
      </label>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : classId ? "บันทึกผู้เรียนลงรุ่นนี้" : "เพิ่มผู้เรียน"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
      {state.success && <p className="notice success">{state.success}</p>}
    </form>
  );
}
