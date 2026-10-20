"use client";

import { useActionState, useState } from "react";
import {
  previewInstructorImport,
  commitInstructorImport,
  type PreviewState,
  type CommitState,
} from "./actions";
import { StepIndicator } from "@/components/ui/StepIndicator";

const previewInitial: PreviewState = {};
const commitInitial: CommitState = {};

type ClassOption = { class_id: string; label: string };

export function ImportClient({ unitId, classes }: { unitId: string; classes: ClassOption[] }) {
  const [previewState, previewAction, previewPending] = useActionState(
    previewInstructorImport,
    previewInitial,
  );
  const [commitState, commitAction, commitPending] = useActionState(
    commitInstructorImport,
    commitInitial,
  );
  const [classId, setClassId] = useState("");
  const [confirmArmed, setConfirmArmed] = useState(false);

  const steps = ["อัปโหลดไฟล์", "ตรวจสอบข้อมูล", "ยืนยันการนำเข้า"];
  const step = commitState.created !== undefined ? 2 : previewState.rows ? 1 : 0;

  if (commitState.created !== undefined) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <StepIndicator steps={steps} current={step} />
        <p className="notice success">นำเข้าสำเร็จ: เพิ่มวิทยากร {commitState.created} คน</p>
        <a href="/unit/import-instructors" className="btn secondary">
          นำเข้าไฟล์อื่น
        </a>
      </div>
    );
  }

  if (!previewState.rows) {
    return (
      <div className="card" style={{ maxWidth: 420 }}>
        <StepIndicator steps={steps} current={step} />
        <form action={previewAction} style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <label>
            <span className="field-label">รุ่นฝึกอบรมที่จะเพิ่มวิทยากร</span>
            <select
              name="class_id_select"
              required
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="field"
            >
              <option value="">-- เลือกรุ่นฝึกอบรม --</option>
              {classes.map((c) => (
                <option key={c.class_id} value={c.class_id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <a href="/api/import-template/instructors" className="footnote">
            ดาวน์โหลดเทมเพลต CSV
          </a>
          <input name="file" type="file" accept=".csv" required className="field" />
          <button type="submit" className="btn primary" disabled={previewPending || !classId}>
            {previewPending ? "กำลังตรวจสอบ..." : "ตรวจสอบไฟล์"}
          </button>
          {previewState.error && <p className="notice error">{previewState.error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="card">
      <StepIndicator steps={steps} current={step} />
      <p style={{ marginBottom: 14 }}>
        ไฟล์ {previewState.fileName}: ผ่าน <strong>{previewState.passCount}</strong> แถว / ไม่ผ่าน{" "}
        <strong>{previewState.failCount}</strong> แถว
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>แถว</th>
              <th>ชื่อ</th>
              <th>เบอร์โทร</th>
              <th>อีเมล</th>
              <th>บทบาท</th>
              <th>สถานะ</th>
              <th>สาเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {previewState.rows.map((r) => (
              <tr key={r.rowNumber}>
                <td>{r.rowNumber}</td>
                <td>{r.name}</td>
                <td>{r.phone}</td>
                <td>{r.email}</td>
                <td>{r.role_in_class}</td>
                <td>
                  <span className={`pill ${r.status === "pass" ? "done" : "fail"}`}>
                    {r.status === "pass" ? "ผ่าน" : "ไม่ผ่าน"}
                  </span>
                </td>
                <td>{r.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previewState.passCount! > 0 && (
        <form action={commitAction} style={{ display: "grid", gap: 10, maxWidth: 360, marginTop: 20 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <input type="hidden" name="class_id" value={classId} />
          <input type="hidden" name="rows" value={JSON.stringify(previewState.rows)} />
          {!confirmArmed ? (
            <button type="button" className="btn primary" onClick={() => setConfirmArmed(true)}>
              นำเข้า {previewState.passCount} รายการ
            </button>
          ) : (
            <>
              <p className="notice" style={{ background: "#fff3da", color: "#76520c", border: "1px solid #f0d9a6" }}>
                ยืนยันอีกครั้ง — การนำเข้าจะเพิ่มวิทยากร {previewState.passCount} คนทันที
              </p>
              <button type="submit" className="btn primary" disabled={commitPending}>
                {commitPending ? "กำลังนำเข้า..." : "ยืนยันนำเข้า"}
              </button>
            </>
          )}
        </form>
      )}
      {commitState.error && <p className="notice error">{commitState.error}</p>}
    </div>
  );
}
