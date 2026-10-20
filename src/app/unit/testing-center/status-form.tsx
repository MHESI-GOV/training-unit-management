"use client";

import { useActionState } from "react";
import { upsertTestingCenterStatus, type TestingCenterFormState } from "./actions";
import { ASSESSMENT_STANDARD_LABEL, TESTING_CENTER_STATUS_LABEL } from "@/lib/labels";

const initialState: TestingCenterFormState = {};

export function StatusForm({ unitId }: { unitId: string }) {
  const [state, formAction, pending] = useActionState(upsertTestingCenterStatus, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      <label>
        <span className="field-label">มาตรฐาน</span>
        <select name="standard_type" required className="field">
          <option value="">-- เลือกมาตรฐาน --</option>
          {Object.entries(ASSESSMENT_STANDARD_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="field-label">สถานะศูนย์ทดสอบ</span>
        <select name="status" required className="field">
          <option value="">-- เลือกสถานะ --</option>
          {Object.entries(TESTING_CENTER_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="field-label">หลักฐานอ้างอิง</span>
        <input name="evidence_ref" className="field" />
      </label>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}
