"use client";

import { useActionState } from "react";
import { createCourse, type CourseFormState } from "./actions";

const initialState: CourseFormState = {};

export function CourseForm() {
  const [state, formAction, pending] = useActionState(createCourse, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12, maxWidth: 400 }}>
      <label>
        ชื่อหลักสูตร
        <input name="name" required style={{ width: "100%" }} />
      </label>
      <label>
        จำนวนชั่วโมงรวม
        <input name="total_hours" type="number" min={1} required style={{ width: "100%" }} />
      </label>
      <label>
        ชั่วโมงทฤษฎี
        <input name="theory_hours" type="number" min={0} style={{ width: "100%" }} />
      </label>
      <label>
        ชั่วโมงปฏิบัติ
        <input name="practical_hours" type="number" min={0} style={{ width: "100%" }} />
      </label>
      <label>
        คำอธิบาย
        <textarea name="description" style={{ width: "100%" }} />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "เพิ่มหลักสูตร"}
      </button>
      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
    </form>
  );
}
