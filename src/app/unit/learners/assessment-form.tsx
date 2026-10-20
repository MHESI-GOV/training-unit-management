"use client";

import { useActionState } from "react";
import { recordAssessmentResult, type AssessmentFormState } from "./actions";
import { ASSESSMENT_STANDARD_LABEL, ASSESSMENT_RESULT_LABEL } from "@/lib/labels";

const initialState: AssessmentFormState = {};

export function AssessmentForm({ unitId, learnerId }: { unitId: string; learnerId: string }) {
  const [state, formAction, pending] = useActionState(recordAssessmentResult, initialState);

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input type="hidden" name="unit_id" value={unitId} />
      <input type="hidden" name="learner_id" value={learnerId} />
      <select name="standard_type" required className="field" style={{ width: "auto" }}>
        <option value="">-- มาตรฐาน --</option>
        {Object.entries(ASSESSMENT_STANDARD_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select name="result" required className="field" style={{ width: "auto" }}>
        <option value="">-- ผล --</option>
        {Object.entries(ASSESSMENT_RESULT_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input name="tested_at" type="date" className="field" style={{ width: "auto" }} />
      <input name="evidence_ref" placeholder="หลักฐานอ้างอิง" className="field" style={{ width: "auto" }} />
      <button type="submit" className="btn secondary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "บันทึกผล"}
      </button>
      {state.error && <p className="notice error" style={{ width: "100%" }}>{state.error}</p>}
    </form>
  );
}
