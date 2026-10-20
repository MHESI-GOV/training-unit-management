"use client";

import { useActionState } from "react";
import { upsertTestingCenterStatus, type TestingCenterFormState } from "./actions";
import { ASSESSMENT_STANDARD_LABEL, TESTING_CENTER_STATUS_LABEL } from "@/lib/labels";

const initialState: TestingCenterFormState = {};

export function StatusForm({ unitId }: { unitId: string }) {
  const [state, formAction, pending] = useActionState(upsertTestingCenterStatus, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      <label>
        มาตรฐาน
        <select name="standard_type" required style={{ width: "100%" }}>
          <option value="">-- เลือกมาตรฐาน --</option>
          {Object.entries(ASSESSMENT_STANDARD_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        สถานะศูนย์ทดสอบ
        <select name="status" required style={{ width: "100%" }}>
          <option value="">-- เลือกสถานะ --</option>
          {Object.entries(TESTING_CENTER_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        หลักฐานอ้างอิง
        <input name="evidence_ref" style={{ width: "100%" }} />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
    </form>
  );
}
