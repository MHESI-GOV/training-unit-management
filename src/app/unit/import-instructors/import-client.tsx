"use client";

import { useActionState, useState } from "react";
import {
  previewInstructorImport,
  commitInstructorImport,
  type PreviewState,
  type CommitState,
} from "./actions";

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

  if (commitState.created !== undefined) {
    return (
      <div>
        <p>นำเข้าสำเร็จ: เพิ่มวิทยากร {commitState.created} คน</p>
        <a href="/unit/import-instructors">นำเข้าไฟล์อื่น</a>
      </div>
    );
  }

  if (!previewState.rows) {
    return (
      <form action={previewAction} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <input type="hidden" name="unit_id" value={unitId} />
        <label>
          รุ่นฝึกอบรมที่จะเพิ่มวิทยากร
          <select
            name="class_id_select"
            required
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="">-- เลือกรุ่นฝึกอบรม --</option>
            {classes.map((c) => (
              <option key={c.class_id} value={c.class_id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <p>
          <a href="/api/import-template/instructors">ดาวน์โหลดเทมเพลต CSV</a>
        </p>
        <input name="file" type="file" accept=".csv" required />
        <button type="submit" disabled={previewPending || !classId}>
          {previewPending ? "กำลังตรวจสอบ..." : "ตรวจสอบไฟล์"}
        </button>
        {previewState.error && <p style={{ color: "crimson" }}>{previewState.error}</p>}
      </form>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p>
        ไฟล์ {previewState.fileName}: ผ่าน {previewState.passCount} แถว / ไม่ผ่าน{" "}
        {previewState.failCount} แถว
      </p>
      <table style={{ fontSize: 13, borderCollapse: "collapse" }}>
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
            <tr key={r.rowNumber} style={{ color: r.status === "fail" ? "crimson" : undefined }}>
              <td>{r.rowNumber}</td>
              <td>{r.name}</td>
              <td>{r.phone}</td>
              <td>{r.email}</td>
              <td>{r.role_in_class}</td>
              <td>{r.status === "pass" ? "ผ่าน" : "ไม่ผ่าน"}</td>
              <td>{r.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {previewState.passCount! > 0 && (
        <form action={commitAction} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <input type="hidden" name="class_id" value={classId} />
          <input type="hidden" name="rows" value={JSON.stringify(previewState.rows)} />
          {!confirmArmed ? (
            <button type="button" onClick={() => setConfirmArmed(true)}>
              นำเข้า {previewState.passCount} รายการ
            </button>
          ) : (
            <>
              <p style={{ color: "darkorange" }}>
                ยืนยันอีกครั้ง — การนำเข้าจะเพิ่มวิทยากร {previewState.passCount} คนทันที
              </p>
              <button type="submit" disabled={commitPending}>
                {commitPending ? "กำลังนำเข้า..." : "ยืนยันนำเข้า"}
              </button>
            </>
          )}
        </form>
      )}
      {commitState.error && <p style={{ color: "crimson" }}>{commitState.error}</p>}
    </div>
  );
}
