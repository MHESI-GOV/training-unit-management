"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { previewUnitImport, commitUnitImport, type PreviewState, type CommitState } from "./actions";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UNIT_TYPE_LABEL, REGION_LABEL } from "@/lib/labels";

const previewInitial: PreviewState = {};
const commitInitial: CommitState = {};

export function ImportUnitsClient() {
  const [previewState, previewAction, previewPending] = useActionState(previewUnitImport, previewInitial);
  const [commitState, commitAction, commitPending] = useActionState(commitUnitImport, commitInitial);
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
        <p className="notice success">
          นำเข้าสำเร็จ: สร้างหน่วยฝึกอบรม {commitState.created} หน่วย
          {commitState.failed ? ` (ล้มเหลว ${commitState.failed} แถว)` : ""}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/admin/units" className="btn primary">
            ไปหน้าหน่วยฝึกอบรม
          </a>
          <a href="/admin/units/import" className="btn secondary">
            นำเข้าไฟล์อื่น
          </a>
        </div>
      </div>
    );
  }

  if (!previewState.rows) {
    return (
      <div className="card" style={{ maxWidth: 440 }}>
        <StepIndicator steps={steps} current={step} />
        <form action={previewAction} style={{ display: "grid", gap: 12 }}>
          <a href="/api/import-template/units" className="footnote">
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
              <th>ชื่อหน่วย</th>
              <th>ประเภท</th>
              <th>ภูมิภาค</th>
              <th>จังหวัด</th>
              <th>ผู้ประสานงาน</th>
              <th>สถานะ</th>
              <th>สาเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {previewState.rows.map((r) => (
              <tr key={r.rowNumber}>
                <td>{r.rowNumber}</td>
                <td>{r.name || "—"}</td>
                <td>{UNIT_TYPE_LABEL[r.type] ?? (r.type || "—")}</td>
                <td>{REGION_LABEL[r.region] ?? (r.region || "—")}</td>
                <td>{r.province_name || "—"}</td>
                <td>{[r.coordinator_first_name, r.coordinator_last_name].filter(Boolean).join(" ") || "—"}</td>
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
          <input type="hidden" name="rows" value={JSON.stringify(previewState.rows)} />
          <input type="hidden" name="file_name" value={previewState.fileName ?? "unit_import"} />
          <button type="button" className="btn primary" onClick={() => setConfirmOpen(true)}>
            นำเข้า {previewState.passCount} หน่วย
          </button>
        </form>
      )}

      <ConfirmDialog
        open={confirmOpen}
        pending={commitPending}
        title="ยืนยันการนำเข้าหน่วยฝึกอบรม"
        confirmLabel="ยืนยันนำเข้า"
        message={<>จะสร้างหน่วยฝึกอบรม <strong>{previewState.passCount}</strong> หน่วยทันที</>}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
      />
      {commitState.error && <p className="notice error">{commitState.error}</p>}
    </div>
  );
}
