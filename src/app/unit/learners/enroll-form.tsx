"use client";

import { useActionState } from "react";
import { enrollLearner, type EnrollFormState } from "./actions";

const initialState: EnrollFormState = {};

type ClassOption = { class_id: string; label: string };

export function EnrollForm({ learnerId, classes }: { learnerId: string; classes: ClassOption[] }) {
  const [state, formAction, pending] = useActionState(enrollLearner, initialState);

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="learner_id" value={learnerId} />
      <select name="class_id" required>
        <option value="">-- เลือกรุ่นฝึกอบรม --</option>
        {classes.map((c) => (
          <option key={c.class_id} value={c.class_id}>
            {c.label}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending}>
        {pending ? "กำลังตรวจสอบ..." : "ลงทะเบียนเรียน"}
      </button>
      {state.error && <span style={{ color: "crimson" }}>{state.error}</span>}
      {state.eligibility && (
        <span style={{ color: state.eligibility.startsWith("ไม่มีสิทธิ์") ? "crimson" : "green" }}>
          {state.eligibility}
        </span>
      )}
    </form>
  );
}
