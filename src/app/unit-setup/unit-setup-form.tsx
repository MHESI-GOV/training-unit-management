"use client";

import { useActionState } from "react";
import { submitTrainingUnit, type SubmitUnitState } from "./actions";
import { UNIT_TYPE_LABEL, REGION_LABEL } from "@/lib/labels";
import { LocationPicker } from "./LocationPicker";

const initialState: SubmitUnitState = {};

export function UnitSetupForm() {
  const [state, formAction, pending] = useActionState(submitTrainingUnit, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 14 }}>
      <label>
        <span className="field-label">ชื่อหน่วยฝึกอบรม</span>
        <input name="name" required className="field" />
      </label>
      <label>
        <span className="field-label">ประเภทหน่วย</span>
        <select name="type" required className="field">
          {Object.entries(UNIT_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="field-label">ภูมิภาค</span>
        <select name="region" required className="field">
          {Object.entries(REGION_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="field-label">รหัสอ้างอิงเดิม (ถ้ามี)</span>
        <input name="external_ref" className="field" />
      </label>
      <LocationPicker />
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "บันทึกและเริ่มใช้งาน"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}
