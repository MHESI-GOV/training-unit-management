"use client";

import { useActionState } from "react";
import { submitTrainingUnit, type SubmitUnitState } from "./actions";
import { UNIT_TYPE_LABEL, REGION_LABEL } from "@/lib/labels";

const initialState: SubmitUnitState = {};

export function UnitSetupForm() {
  const [state, formAction, pending] = useActionState(submitTrainingUnit, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12, maxWidth: 400 }}>
      <label>
        ชื่อหน่วยฝึกอบรม
        <input name="name" required style={{ width: "100%" }} />
      </label>
      <label>
        ประเภทหน่วย
        <select name="type" required style={{ width: "100%" }}>
          {Object.entries(UNIT_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        ภูมิภาค
        <select name="region" required style={{ width: "100%" }}>
          {Object.entries(REGION_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        รหัสอ้างอิงเดิม (ถ้ามี)
        <input name="external_ref" style={{ width: "100%" }} />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "บันทึกและเริ่มใช้งาน"}
      </button>
      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
    </form>
  );
}
