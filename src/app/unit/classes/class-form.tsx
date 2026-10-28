"use client";

import { useActionState, useEffect } from "react";
import { createClass, updateClass, type ClassFormState } from "./actions";
import { CLASS_MODE_LABEL } from "@/lib/labels";

const initialState: ClassFormState = {};

export type ClassEdit = {
  class_id: string;
  course_id: string;
  name: string | null;
  start_date: string;
  end_date: string;
  seat_count: number;
  schedule_time: string | null;
  lead_instructor_id: string | null;
  mode: string | null;
  location: string | null;
  status: string;
  note: string | null;
};

export function ClassForm({
  unitId,
  courses,
  instructors,
  edit,
  onDone,
}: {
  unitId: string;
  courses: { course_id: string; name: string }[];
  instructors: { instructor_id: string; name: string }[];
  edit?: ClassEdit;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(edit ? updateClass : createClass, initialState);

  useEffect(() => {
    if (state.success && onDone) onDone();
  }, [state.success, onDone]);

  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      {edit && <input type="hidden" name="class_id" value={edit.class_id} />}

      {edit && <p className="footnote">รหัสรุ่น: ระบบกำหนดอัตโนมัติ (แก้ไขไม่ได้)</p>}

      <label>
        <span className="field-label">หลักสูตร *</span>
        <select name="course_id" required defaultValue={edit?.course_id ?? ""} className="field">
          <option value="">-- เลือกหลักสูตร --</option>
          {courses.map((c) => (
            <option key={c.course_id} value={c.course_id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label>
        <span className="field-label">ชื่อรุ่น (ถ้ามี)</span>
        <input name="name" defaultValue={edit?.name ?? ""} className="field" placeholder="เช่น รุ่นเช้า, รุ่นที่ 1/2569" />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">วันเริ่มต้น *</span>
          <input name="start_date" type="date" required defaultValue={edit?.start_date ?? ""} className="field" />
        </label>
        <label>
          <span className="field-label">วันสิ้นสุด *</span>
          <input name="end_date" type="date" required defaultValue={edit?.end_date ?? ""} className="field" />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">เวลาเรียน</span>
          <input name="schedule_time" defaultValue={edit?.schedule_time ?? ""} className="field" placeholder="เช่น 09:00–16:00 จ.–ศ." />
        </label>
        <label>
          <span className="field-label">จำนวนที่รองรับ *</span>
          <input name="seat_count" type="number" min={1} required defaultValue={edit?.seat_count ?? ""} className="field" />
        </label>
      </div>

      <label>
        <span className="field-label">หัวหน้าผู้สอน (จากคลังวิทยากร)</span>
        <select name="lead_instructor_id" defaultValue={edit?.lead_instructor_id ?? ""} className="field">
          <option value="">-- ไม่ระบุ --</option>
          {instructors.map((i) => (
            <option key={i.instructor_id} value={i.instructor_id}>{i.name}</option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">รูปแบบการเรียน</span>
          <select name="mode" defaultValue={edit?.mode ?? ""} className="field">
            <option value="">-- ไม่ระบุ --</option>
            {Object.entries(CLASS_MODE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">สถานที่/ห้องเรียน</span>
          <input name="location" defaultValue={edit?.location ?? ""} className="field" />
        </label>
      </div>

      <p className="footnote">สถานะรุ่น (รับสมัคร / อยู่ระหว่างเรียน / เสร็จสิ้น) ระบบกำหนดให้อัตโนมัติตามวันเริ่ม–วันสิ้นสุด</p>

      <label>
        <span className="field-label">หมายเหตุ</span>
        <textarea name="note" defaultValue={edit?.note ?? ""} rows={2} className="field" />
      </label>

      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : edit ? "บันทึกการแก้ไข" : "สร้างชั้นเรียน"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}
