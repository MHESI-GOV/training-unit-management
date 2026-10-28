"use client";

import { useActionState, useEffect, useRef } from "react";
import { GENDER_LABEL } from "@/lib/labels";
import { createLearner, updateLearner, type LearnerFormState } from "./actions";

const initialState: LearnerFormState = {};

export type LearnerEdit = {
  learner_id: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  occupation: string | null;
  masked_id: string;
};

export function LearnerForm({
  unitId,
  classId,
  edit,
  onDone,
}: {
  unitId: string;
  classId?: string;
  edit?: LearnerEdit;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(edit ? updateLearner : createLearner, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // On create: clear so the next learner can be entered. On edit: close the popup.
  useEffect(() => {
    if (!state.success) return;
    if (edit) onDone?.();
    else formRef.current?.reset();
  }, [state.success, edit, onDone]);

  return (
    <form ref={formRef} action={formAction} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      {classId && <input type="hidden" name="class_id" value={classId} />}
      {edit && <input type="hidden" name="learner_id" value={edit.learner_id} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">ชื่อ</span>
          <input name="first_name" required defaultValue={edit?.first_name ?? ""} className="field" />
        </label>
        <label>
          <span className="field-label">นามสกุล</span>
          <input name="last_name" required defaultValue={edit?.last_name ?? ""} className="field" />
        </label>
      </div>
      <label>
        <span className="field-label">เพศ</span>
        <select name="gender" defaultValue={edit?.gender ?? ""} className="field">
          <option value="">— ไม่ระบุ —</option>
          {Object.entries(GENDER_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
      {edit ? (
        <label>
          <span className="field-label">เลขบัตรประชาชน (แก้ไขไม่ได้)</span>
          <input value={edit.masked_id} readOnly disabled className="field" style={{ fontVariantNumeric: "tabular-nums" }} />
        </label>
      ) : (
        <label>
          <span className="field-label">เลขบัตรประชาชน (13 หลัก)</span>
          <input name="national_id" inputMode="numeric" pattern="\d{13}" required className="field" />
        </label>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">วันเกิด (ใช้คำนวณอายุ)</span>
          <input name="birth_date" type="date" defaultValue={edit?.birth_date ?? ""} className="field" />
        </label>
        <label>
          <span className="field-label">อาชีพ</span>
          <input name="occupation" defaultValue={edit?.occupation ?? ""} className="field" />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">เบอร์โทร</span>
          <input name="phone" defaultValue={edit?.phone ?? ""} className="field" />
        </label>
        <label>
          <span className="field-label">อีเมล</span>
          <input name="email" type="email" defaultValue={edit?.email ?? ""} className="field" />
        </label>
      </div>
      <label>
        <span className="field-label">ที่อยู่</span>
        <textarea name="address" defaultValue={edit?.address ?? ""} className="field" rows={2} />
      </label>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : edit ? "บันทึกการแก้ไข" : classId ? "บันทึกผู้เรียนลงรุ่นนี้" : "เพิ่มผู้เรียน"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
      {state.success && <p className="notice success">{state.success}</p>}
    </form>
  );
}
