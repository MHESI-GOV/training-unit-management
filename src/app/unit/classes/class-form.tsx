"use client";

import { useActionState, useEffect } from "react";
import { createClass, updateClass, type ClassFormState } from "./actions";
import { CLASS_MODE_LABEL } from "@/lib/labels";
import { type ConfirmedRound, currentThaiFiscalYear } from "@/lib/participation";

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
  isStaff = false,
  courses,
  instructors,
  confirmedRounds = [],
  edit,
  onDone,
}: {
  unitId: string;
  isStaff?: boolean;
  courses: { course_id: string; name: string }[];
  instructors: { instructor_id: string; name: string }[];
  confirmedRounds?: ConfirmedRound[];
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

      {/* ปีงบประมาณที่ผูก — ตั้งตอนสร้างจากปีที่หน่วยยืนยันเข้าร่วม (แก้ไขไม่ได้ภายหลัง) */}
      {/* Staff: กรอกปีงบได้อิสระ ระบบบันทึกการเข้าร่วมให้หน่วยอัตโนมัติ (ไม่ต้องยืนยันการเข้าร่วมก่อน) */}
      {!edit && isStaff ? (
        <label>
          <span className="field-label">ปีงบประมาณ (พ.ศ.) *</span>
          <input
            name="fiscal_year"
            type="number"
            required
            min={2500}
            max={2700}
            defaultValue={confirmedRounds[0]?.fiscal_year ?? currentThaiFiscalYear()}
            className="field"
            style={{ maxWidth: 160 }}
          />
          <span className="footnote" style={{ display: "block", marginTop: 4 }}>
            รุ่นนี้จะผูกกับปีงบประมาณนี้ และระบบจะบันทึกการเข้าร่วมปีงบนี้ให้หน่วยอัตโนมัติ
          </span>
        </label>
      ) : null}
      {!edit && !isStaff && confirmedRounds.length === 1 && (
        <>
          <input type="hidden" name="fiscal_year" value={confirmedRounds[0].fiscal_year} />
          <p className="notice" style={{ background: "#eaf3fd", color: "#1a4e86", border: "1px solid #c5ddf5" }}>
            รุ่นนี้จะอยู่ใน <strong>ปีงบประมาณ {confirmedRounds[0].fiscal_year}</strong> (ปีที่หน่วยยืนยันเข้าร่วม)
          </p>
        </>
      )}
      {!edit && !isStaff && confirmedRounds.length > 1 && (
        <label>
          <span className="field-label">ปีงบประมาณ (ปีที่หน่วยยืนยันเข้าร่วม) *</span>
          <select name="fiscal_year" required defaultValue={confirmedRounds[0].fiscal_year} className="field">
            {confirmedRounds.map((r) => (
              <option key={r.round_id} value={r.fiscal_year}>ปีงบประมาณ {r.fiscal_year}</option>
            ))}
          </select>
        </label>
      )}

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
