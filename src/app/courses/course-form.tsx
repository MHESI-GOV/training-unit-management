"use client";

import { useActionState } from "react";
import { createCourse, type CourseFormState } from "./actions";

const initialState: CourseFormState = {};

export function CourseForm() {
  const [state, formAction, pending] = useActionState(createCourse, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <label>
        <span className="field-label">ชื่อหลักสูตร</span>
        <input name="name" required className="field" />
      </label>
      <label>
        <span className="field-label">จำนวนชั่วโมงรวม</span>
        <input name="total_hours" type="number" min={1} required className="field" />
      </label>
      <label>
        <span className="field-label">ชั่วโมงทฤษฎี</span>
        <input name="theory_hours" type="number" min={0} className="field" />
      </label>
      <label>
        <span className="field-label">ชั่วโมงปฏิบัติ</span>
        <input name="practical_hours" type="number" min={0} className="field" />
      </label>
      <label>
        <span className="field-label">คำอธิบาย</span>
        <textarea name="description" className="field" rows={3} />
      </label>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "เพิ่มหลักสูตร"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}
