"use client";

import { useActionState, useState } from "react";
import { previewClassImport, commitClassImport, type PreviewState, type CommitState } from "./actions";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { formatThaiDate } from "@/lib/date-format";

const previewInitial: PreviewState = {};
const commitInitial: CommitState = {};

export function ImportClient({ unitId }: { unitId: string }) {
  const [previewState, previewAction, previewPending] = useActionState(previewClassImport, previewInitial);
  const [commitState, commitAction, commitPending] = useActionState(commitClassImport, commitInitial);
  const [confirmArmed, setConfirmArmed] = useState(false);

  const steps = ["อัปโหลดไฟล์", "ตรวจสอบข้อมูล", "ยืนยันการนำเข้า"];
  const step = commitState.created !== undefined ? 2 : previewState.rows ? 1 : 0;

  if (commitState.created !== undefined) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <StepIndicator steps={steps} current={step} />
        <p className="notice success">นำเข้าสำเร็จ: สร้างรุ่นฝึกอบรม {commitState.created} รุ่น</p>
        <a href="/unit/import-classes" className="btn secondary">
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
          <a href="/api/import-template/classes" className="footnote">
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
              <th>หลักสูตร</th>
              <th>ชื่อรุ่น</th>
              <th>วันที่</th>
              <th>เวลาเรียน</th>
              <th>ที่นั่ง</th>
              <th>รูปแบบ</th>
              <th>สถานที่</th>
              <th>สถานะ</th>
              <th>สาเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {previewState.rows.map((r) => (
              <tr key={r.rowNumber}>
                <td>{r.rowNumber}</td>
                <td>{r.course_name}</td>
                <td>{r.name || "—"}</td>
                <td>
                  {formatThaiDate(r.start_date)} – {formatThaiDate(r.end_date)}
                </td>
                <td>{r.schedule_time || "—"}</td>
                <td>{r.seat_count}</td>
                <td>{r.mode || "—"}</td>
                <td>{r.location || "—"}</td>
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
          <input type="hidden" name="rows" value={JSON.stringify(previewState.rows)} />
          {!confirmArmed ? (
            <button type="button" className="btn primary" onClick={() => setConfirmArmed(true)}>
              นำเข้า {previewState.passCount} รายการ
            </button>
          ) : (
            <>
              <p className="notice" style={{ background: "#fff3da", color: "#76520c", border: "1px solid #f0d9a6" }}>
                ยืนยันอีกครั้ง — การนำเข้าจะสร้างรุ่นฝึกอบรม {previewState.passCount} รุ่นทันที
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
