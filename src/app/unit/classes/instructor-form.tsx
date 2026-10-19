"use client";

import { useActionState } from "react";
import { addInstructorToClass, type InstructorFormState } from "./actions";

const initialState: InstructorFormState = {};

export function InstructorForm({ classId }: { classId: string }) {
  const [state, formAction, pending] = useActionState(addInstructorToClass, initialState);

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input type="hidden" name="class_id" value={classId} />
      <input name="name" placeholder="ชื่อวิทยากร" required />
      <input name="phone" placeholder="เบอร์โทร" />
      <input name="email" placeholder="อีเมล" />
      <input name="role_in_class" placeholder="บทบาท (เช่น หัวหน้าวิทยากร)" />
      <button type="submit" disabled={pending}>
        {pending ? "กำลังเพิ่ม..." : "เพิ่มวิทยากร"}
      </button>
      {state.error && <p style={{ color: "crimson", width: "100%" }}>{state.error}</p>}
    </form>
  );
}
