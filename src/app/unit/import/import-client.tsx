"use client";

import { useActionState, useState } from "react";
import { previewImport, commitImport, type PreviewState, type CommitState } from "./actions";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { formatThaiDate } from "@/lib/date-format";

const previewInitial: PreviewState = {};
const commitInitial: CommitState = {};

export function ImportClient({
  unitId,
  classId,
  classLabel,
}: {
  unitId: string;
  classId: string;
  classLabel: string;
}) {
  const [previewState, previewAction, previewPending] = useActionState(previewImport, previewInitial);
  const [commitState, commitAction, commitPending] = useActionState(commitImport, commitInitial);
  const [confirmArmed, setConfirmArmed] = useState(false);

  const step = commitState.created !== undefined ? 2 : previewState.rows ? 1 : 0;
  const steps = ["อัปโหลดไฟล์", "ตรวจสอบข้อมูล", "ยืนยันการนำเข้า"];
  const importHref = `/unit/import?unit_id=${unitId}&class_id=${classId}`;

  if (commitState.created !== undefined) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <StepIndicator steps={steps} current={step} />
        <p className="notice success">
          นำเข้าสำเร็จ: บันทึกผู้เรียน {commitState.created} คน ลงรุ่น {classLabel}
          {commitState.enrolled ? ` · ลงรุ่นสำเร็จ ${commitState.enrolled} คน` : ""}
          {commitState.blocked ? ` · ถูกบล็อกโดยการตรวจสอบสิทธิ์ ${commitState.blocked} คน` : ""}
        </p>
        <a href={importHref} className="btn secondary">
          นำเข้าไฟล์อื่น
        </a>
      </div>
    );
  }

  if (!previewState.rows) {
    return (
      <div className="card" style={{ maxWidth: 440 }}>
        <StepIndicator steps={steps} current={step} />
        <form action={previewAction} style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <a href="/api/import-template/learners" className="footnote">
            ดาวน์โหลดเทมเพลต (.xlsx มี dropdown — ครบทุกคอลัมน์: ชื่อ-สกุล, เลขบัตร, วันเกิด, เพศ, อาชีพ, เบอร์, อีเมล, ที่อยู่)
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
              <th>ชื่อ-นามสกุล</th>
              <th>เลขบัตร</th>
              <th>วันเกิด</th>
              <th>เพศ</th>
              <th>อาชีพ</th>
              <th>สถานะ</th>
              <th>สาเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {previewState.rows.map((r) => (
              <tr key={r.rowNumber}>
                <td>{r.rowNumber}</td>
                <td>
                  {r.first_name} {r.last_name}
                </td>
                <td>{r.national_id}</td>
                <td>{formatThaiDate(r.birth_date)}</td>
                <td>{r.gender || "—"}</td>
                <td>{r.occupation || "—"}</td>
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
        <form action={commitAction} style={{ display: "grid", gap: 10, maxWidth: 420, marginTop: 20 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <input type="hidden" name="class_id" value={classId} />
          <input type="hidden" name="file_name" value={previewState.fileName} />
          <input type="hidden" name="rows" value={JSON.stringify(previewState.rows)} />
          {!confirmArmed ? (
            <button type="button" className="btn primary" onClick={() => setConfirmArmed(true)}>
              บันทึก {previewState.passCount} คน ลงรุ่น {classLabel}
            </button>
          ) : (
            <>
              <p className="notice" style={{ background: "#fff3da", color: "#76520c", border: "1px solid #f0d9a6" }}>
                ยืนยันอีกครั้ง — จะสร้างผู้เรียน {previewState.passCount} คน และลงรุ่น {classLabel} ทันที
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
