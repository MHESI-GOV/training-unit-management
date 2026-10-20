"use client";

import { useActionState, useState } from "react";
import { previewImport, commitImport, type PreviewState, type CommitState } from "./actions";

const previewInitial: PreviewState = {};
const commitInitial: CommitState = {};

type ClassOption = { class_id: string; label: string };

export function ImportClient({ unitId, classes }: { unitId: string; classes: ClassOption[] }) {
  const [previewState, previewAction, previewPending] = useActionState(previewImport, previewInitial);
  const [commitState, commitAction, commitPending] = useActionState(commitImport, commitInitial);
  const [confirmArmed, setConfirmArmed] = useState(false);

  if (commitState.created !== undefined) {
    return (
      <div>
        <p>
          นำเข้าสำเร็จ: เพิ่มผู้เรียน {commitState.created} คน
          {commitState.enrolled ? ` ลงทะเบียนเรียนสำเร็จ ${commitState.enrolled} คน` : ""}
          {commitState.blocked ? ` ถูกบล็อกโดยการตรวจสอบสิทธิ์ ${commitState.blocked} คน` : ""}
        </p>
        <a href="/unit/import">นำเข้าไฟล์อื่น</a>
      </div>
    );
  }

  if (!previewState.rows) {
    return (
      <form action={previewAction} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <input type="hidden" name="unit_id" value={unitId} />
        <p>
          <a href="/api/import-template/learners">ดาวน์โหลดเทมเพลต CSV</a>
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
            <th>ชื่อ-นามสกุล</th>
            <th>เลขบัตร</th>
            <th>สถานะ</th>
            <th>สาเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {previewState.rows.map((r) => (
            <tr key={r.rowNumber} style={{ color: r.status === "fail" ? "crimson" : undefined }}>
              <td>{r.rowNumber}</td>
              <td>
                {r.first_name} {r.last_name}
              </td>
              <td>{r.national_id}</td>
              <td>{r.status === "pass" ? "ผ่าน" : "ไม่ผ่าน"}</td>
              <td>{r.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {previewState.passCount! > 0 && (
        <form action={commitAction} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <input type="hidden" name="file_name" value={previewState.fileName} />
          <input type="hidden" name="rows" value={JSON.stringify(previewState.rows)} />
          <label>
            ลงทะเบียนเรียนรุ่น (ไม่บังคับ)
            <select name="class_id" style={{ width: "100%" }}>
              <option value="">-- ไม่ลงทะเบียน (เพิ่มผู้เรียนอย่างเดียว) --</option>
              {classes.map((c) => (
                <option key={c.class_id} value={c.class_id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {!confirmArmed ? (
            <button type="button" onClick={() => setConfirmArmed(true)}>
              นำเข้า {previewState.passCount} รายการ
            </button>
          ) : (
            <>
              <p style={{ color: "darkorange" }}>
                ยืนยันอีกครั้ง — การนำเข้าจะสร้างผู้เรียน {previewState.passCount} คนในระบบทันที
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
