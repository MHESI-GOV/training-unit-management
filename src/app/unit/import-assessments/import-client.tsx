"use client";

import { useActionState, useState } from "react";
import {
  previewAssessmentImport,
  commitAssessmentImport,
  type PreviewState,
  type CommitState,
} from "./actions";
import { ASSESSMENT_STANDARD_LABEL, ASSESSMENT_RESULT_LABEL } from "@/lib/labels";

const previewInitial: PreviewState = {};
const commitInitial: CommitState = {};

export function ImportClient({ unitId }: { unitId: string }) {
  const [previewState, previewAction, previewPending] = useActionState(
    previewAssessmentImport,
    previewInitial,
  );
  const [commitState, commitAction, commitPending] = useActionState(
    commitAssessmentImport,
    commitInitial,
  );
  const [confirmArmed, setConfirmArmed] = useState(false);

  if (commitState.created !== undefined) {
    return (
      <div>
        <p>นำเข้าสำเร็จ: บันทึกผลทดสอบ {commitState.created} รายการ</p>
        <a href="/unit/import-assessments">นำเข้าไฟล์อื่น</a>
      </div>
    );
  }

  if (!previewState.rows) {
    return (
      <form action={previewAction} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <input type="hidden" name="unit_id" value={unitId} />
        <p>
          <a href="/api/import-template/assessments">ดาวน์โหลดเทมเพลต CSV</a>
        </p>
        <input name="file" type="file" accept=".csv" required />
        <button type="submit" disabled={previewPending}>
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
            <th>ผู้เรียน</th>
            <th>มาตรฐาน</th>
            <th>ผล</th>
            <th>สถานะ</th>
            <th>สาเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {previewState.rows.map((r) => (
            <tr key={r.rowNumber} style={{ color: r.status === "fail" ? "crimson" : undefined }}>
              <td>{r.rowNumber}</td>
              <td>{r.learner_name ?? r.national_id}</td>
              <td>{ASSESSMENT_STANDARD_LABEL[r.standard_type] ?? r.standard_type}</td>
              <td>{ASSESSMENT_RESULT_LABEL[r.result] ?? r.result}</td>
              <td>{r.status === "pass" ? "ผ่าน" : "ไม่ผ่าน"}</td>
              <td>{r.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {previewState.passCount! > 0 && (
        <form action={commitAction} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <input type="hidden" name="rows" value={JSON.stringify(previewState.rows)} />
          {!confirmArmed ? (
            <button type="button" onClick={() => setConfirmArmed(true)}>
              นำเข้า {previewState.passCount} รายการ
            </button>
          ) : (
            <>
              <p style={{ color: "darkorange" }}>
                ยืนยันอีกครั้ง — การนำเข้าจะบันทึกผลทดสอบ {previewState.passCount} รายการทันที
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
