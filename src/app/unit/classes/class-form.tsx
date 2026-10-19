"use client";

import { useActionState } from "react";
import { createClass, type ClassFormState } from "./actions";

const initialState: ClassFormState = {};

export function ClassForm({ courses }: { courses: { course_id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createClass, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12, maxWidth: 400 }}>
      <label>
        หลักสูตร
        <select name="course_id" required style={{ width: "100%" }}>
          <option value="">-- เลือกหลักสูตร --</option>
          {courses.map((c) => (
            <option key={c.course_id} value={c.course_id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        วันเริ่มต้น
        <input name="start_date" type="date" required style={{ width: "100%" }} />
      </label>
      <label>
        วันสิ้นสุด
        <input name="end_date" type="date" required style={{ width: "100%" }} />
      </label>
      <label>
        จำนวนที่นั่ง
        <input name="seat_count" type="number" min={1} required style={{ width: "100%" }} />
      </label>
      <label>
        รหัสอ้างอิงเดิม (ถ้ามี)
        <input name="external_ref" style={{ width: "100%" }} />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "สร้างรุ่นฝึกอบรม"}
      </button>
      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
    </form>
  );
}
