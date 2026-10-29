"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  previewAssessmentImport,
  commitAssessmentImport,
  type PreviewState,
  type CommitState,
} from "./actions";
import { ASSESSMENT_STANDARD_LABEL, ASSESSMENT_RESULT_LABEL } from "@/lib/labels";
import { StepIndicator } from "@/components/ui/StepIndicator";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (commitState.error) setConfirmOpen(false);
  }, [commitState.error]);

  const steps = ["อัปโหลดไฟล์", "ตรวจสอบข้อมูล", "ยืนยันการนำเข้า"];
  const step = commitState.created !== undefined ? 2 : previewState.rows ? 1 : 0;

  if (commitState.created !== undefined) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <StepIndicator steps={steps} current={step} />
        <p className="notice success">นำเข้าสำเร็จ: บันทึกผลทดสอบ {commitState.created} รายการ</p>
        <a href="/unit/import-assessments" className="btn secondary">
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
          <a href="/api/import-template/assessments" className="footnote">
            ดาวน์โหลดเทมเพลต (.xlsx มี dropdown)
          </a>
          <input name="file" type="file" accept=".csv,.xlsx" required className="field" />
          <button type="submit" className="btn primary" disabled={previewPending}>
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
              <th>ผู้เรียน</th>
              <th>มาตรฐาน</th>
              <th>ผล</th>
              <th>สถานะ</th>
              <th>สาเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {previewState.rows.map((r) => (
              <tr key={r.rowNumber}>
                <td>{r.rowNumber}</td>
                <td>{r.learner_name ?? r.national_id}</td>
                <td>{ASSESSMENT_STANDARD_LABEL[r.standard_type] ?? r.standard_type}</td>
                <td>{ASSESSMENT_RESULT_LABEL[r.result] ?? r.result}</td>
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
        <form ref={formRef} action={commitAction} style={{ display: "grid", gap: 10, maxWidth: 360, marginTop: 20 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <input type="hidden" name="rows" value={JSON.stringify(previewState.rows)} />
          <button type="button" className="btn primary" onClick={() => setConfirmOpen(true)}>
            นำเข้า {previewState.passCount} รายการ
          </button>
        </form>
      )}

      <ConfirmDialog
        open={confirmOpen}
        pending={commitPending}
        title="ยืนยันการนำเข้าผลทดสอบ"
        confirmLabel="ยืนยันนำเข้า"
        message={<>จะบันทึกผลทดสอบ <strong>{previewState.passCount}</strong> รายการทันที</>}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
      />
      {commitState.error && <p className="notice error">{commitState.error}</p>}
    </div>
  );
}
