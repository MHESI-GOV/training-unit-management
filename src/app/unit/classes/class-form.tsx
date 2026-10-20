"use client";

import { useActionState } from "react";
import { createClass, type ClassFormState } from "./actions";

const initialState: ClassFormState = {};

export function ClassForm({
  unitId,
  courses,
}: {
  unitId: string;
  courses: { course_id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createClass, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      <label>
        <span className="field-label">หลักสูตร</span>
        <select name="course_id" required className="field">
          <option value="">-- เลือกหลักสูตร --</option>
          {courses.map((c) => (
            <option key={c.course_id} value={c.course_id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="field-label">วันเริ่มต้น</span>
        <input name="start_date" type="date" required className="field" />
      </label>
      <label>
        <span className="field-label">วันสิ้นสุด</span>
        <input name="end_date" type="date" required className="field" />
      </label>
      <label>
        <span className="field-label">จำนวนที่นั่ง</span>
        <input name="seat_count" type="number" min={1} required className="field" />
      </label>
      <label>
        <span className="field-label">รหัสอ้างอิงเดิม (ถ้ามี)</span>
        <input name="external_ref" className="field" />
      </label>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "สร้างรุ่นฝึกอบรม"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}
