"use client";

import { useActionState } from "react";
import { addInstructorToClass, type InstructorFormState } from "./actions";

const initialState: InstructorFormState = {};

export function InstructorForm({ unitId, classId }: { unitId: string; classId: string }) {
  const [state, formAction, pending] = useActionState(addInstructorToClass, initialState);

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input type="hidden" name="unit_id" value={unitId} />
      <input type="hidden" name="class_id" value={classId} />
      <input name="name" placeholder="ชื่อวิทยากร" required className="field" style={{ width: "auto" }} />
      <input name="phone" placeholder="เบอร์โทร" className="field" style={{ width: "auto" }} />
      <input name="email" placeholder="อีเมล" className="field" style={{ width: "auto" }} />
      <input name="role_in_class" placeholder="บทบาท (เช่น หัวหน้าวิทยากร)" className="field" style={{ width: "auto" }} />
      <button type="submit" className="btn secondary" disabled={pending}>
        {pending ? "กำลังเพิ่ม..." : "เพิ่มวิทยากร"}
      </button>
      {state.error && <p className="notice error" style={{ width: "100%" }}>{state.error}</p>}
    </form>
  );
}
