"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Popup } from "@/components/ui/Popup";
import { FieldSpecTable } from "@/components/ui/FieldSpec";
import {
  createInstructor,
  updateInstructor,
  deleteInstructor,
  previewInstructorImport,
  commitInstructorImport,
  type InstructorState,
  type InstructorPreviewState,
  type InstructorCommitState,
} from "./actions";

export type InstructorRow = {
  instructor_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  class_count: number;
};

const initial: InstructorState = {};
const previewInitial: InstructorPreviewState = {};
const commitInitial: InstructorCommitState = {};

export function InstructorsManager({ unitId, instructors }: { unitId: string; instructors: InstructorRow[] }) {
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InstructorRow | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return instructors;
    return instructors.filter((i) =>
      `${i.name} ${i.phone ?? ""} ${i.email ?? ""}`.toLowerCase().includes(term),
    );
  }, [q, instructors]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <input
          className="field"
          placeholder="ค้นหาชื่อ / เบอร์ / อีเมล"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <span className="footnote" style={{ marginRight: "auto" }}>
          {filtered.length} / {instructors.length} คน
        </span>
        <button className="btn secondary" onClick={() => setCsvOpen(true)}>นำเข้า CSV</button>
        <button className="btn primary" onClick={() => setAddOpen(true)}>+ เพิ่มวิทยากร</button>
      </div>

      {instructors.length === 0 && <p className="footnote">ยังไม่มีวิทยากรในคลัง — เพิ่มทีละคนหรือนำเข้า CSV</p>}

      {instructors.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อวิทยากร</th>
                <th>เบอร์โทร</th>
                <th>อีเมล</th>
                <th>สอนในชั้นเรียน</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.instructor_id}>
                  <td><strong>{i.name}</strong></td>
                  <td>{i.phone ?? "—"}</td>
                  <td>{i.email ?? "—"}</td>
                  <td>{i.class_count} ชั้นเรียน</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 13 }} onClick={() => setEditTarget(i)}>
                        แก้ไข
                      </button>
                      <DeleteButton unitId={unitId} instructor={i} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Popup open={addOpen} onClose={() => setAddOpen(false)} title="เพิ่มวิทยากรเข้าคลัง">
        <InstructorForm unitId={unitId} onDone={() => setAddOpen(false)} />
      </Popup>

      <Popup open={!!editTarget} onClose={() => setEditTarget(null)} title="แก้ไขข้อมูลวิทยากร">
        {editTarget && <InstructorForm unitId={unitId} edit={editTarget} onDone={() => setEditTarget(null)} />}
      </Popup>

      <Popup open={csvOpen} onClose={() => setCsvOpen(false)} title="นำเข้าวิทยากรจากไฟล์ CSV" maxWidth={620}>
        <InstructorCsv unitId={unitId} />
      </Popup>
    </div>
  );
}

function InstructorForm({ unitId, edit, onDone }: { unitId: string; edit?: InstructorRow; onDone: () => void }) {
  const [state, action, pending] = useActionState(edit ? updateInstructor : createInstructor, initial);
  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      {edit && <input type="hidden" name="instructor_id" value={edit.instructor_id} />}
      <label>
        <span className="field-label">ชื่อวิทยากร</span>
        <input name="name" required defaultValue={edit?.name ?? ""} className="field" />
      </label>
      <label>
        <span className="field-label">เบอร์โทร</span>
        <input name="phone" defaultValue={edit?.phone ?? ""} className="field" />
      </label>
      <label>
        <span className="field-label">อีเมล</span>
        <input name="email" type="email" defaultValue={edit?.email ?? ""} className="field" />
      </label>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : edit ? "บันทึกการแก้ไข" : "เพิ่มวิทยากร"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}

function DeleteButton({ unitId, instructor }: { unitId: string; instructor: InstructorRow }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!armed) {
    return (
      <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 13, color: "var(--danger)" }} onClick={() => setArmed(true)}>
        ลบ
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <button
        className="btn secondary"
        style={{ padding: "4px 10px", fontSize: 13, color: "var(--danger)" }}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            try {
              await deleteInstructor(unitId, instructor.instructor_id);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
              setArmed(false);
            }
          })
        }
      >
        {pending ? "กำลังลบ..." : "ยืนยันลบ"}
      </button>
      <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 13 }} onClick={() => setArmed(false)}>
        ยกเลิก
      </button>
      {err && <span style={{ color: "var(--danger)", fontSize: 12 }}>{err}</span>}
    </span>
  );
}

function InstructorCsv({ unitId }: { unitId: string }) {
  const [preview, previewAction, previewPending] = useActionState(previewInstructorImport, previewInitial);
  const [commit, commitAction, commitPending] = useActionState(commitInstructorImport, commitInitial);

  if (commit.created !== undefined) {
    return <p className="notice success">นำเข้าวิทยากรเข้าคลังแล้ว {commit.created} คน</p>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <FieldSpecTable
        specs={[
          { field: "name", type: "ข้อความ", required: true, note: "ชื่อ-นามสกุลวิทยากร" },
          { field: "phone", type: "ข้อความ (ตัวเลข)", required: false, note: "เบอร์โทร" },
          { field: "email", type: "ข้อความ (อีเมล)", required: false },
        ]}
      />
      <a href="/api/import-template/instructors" className="footnote">ดาวน์โหลดเทมเพลต CSV</a>

      {!preview.rows ? (
        <form action={previewAction} style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <input name="file" type="file" accept=".csv" required className="field" />
          <button type="submit" className="btn primary" disabled={previewPending}>
            {previewPending ? "กำลังตรวจสอบ..." : "ตรวจสอบไฟล์"}
          </button>
          {preview.error && <p className="notice error">{preview.error}</p>}
        </form>
      ) : (
        <>
          <p>ผ่าน <strong>{preview.passCount}</strong> / ไม่ผ่าน <strong>{preview.failCount}</strong></p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>แถว</th><th>ชื่อ</th><th>สถานะ</th><th>สาเหตุ</th></tr></thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber}>
                    <td>{r.rowNumber}</td>
                    <td>{r.name}</td>
                    <td><span className={`pill ${r.status === "pass" ? "done" : "fail"}`}>{r.status === "pass" ? "ผ่าน" : "ไม่ผ่าน"}</span></td>
                    <td>{r.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.passCount! > 0 && (
            <form action={commitAction}>
              <input type="hidden" name="unit_id" value={unitId} />
              <input type="hidden" name="rows" value={JSON.stringify(preview.rows)} />
              <button type="submit" className="btn primary" disabled={commitPending}>
                {commitPending ? "กำลังนำเข้า..." : `นำเข้า ${preview.passCount} คน`}
              </button>
            </form>
          )}
          {commit.error && <p className="notice error">{commit.error}</p>}
        </>
      )}
    </div>
  );
}
