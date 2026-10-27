"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Popup } from "@/components/ui/Popup";
import { FieldSpecTable } from "@/components/ui/FieldSpec";
import {
  addInstructorsFromLibrary,
  createInstructorInClass,
  commitClassInstructorImport,
  removeInstructorFromClass,
  type InstructorLinkState,
  type ClassInstructorCsvState,
} from "../actions";
import { previewInstructorImport, type InstructorPreviewState } from "../../instructors/actions";

export type ClassInstructorRow = {
  instructor_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role_in_class: string | null;
  is_lead: boolean;
};
export type LibraryInstructor = { instructor_id: string; name: string; phone: string | null; email: string | null };

const linkInitial: InstructorLinkState = {};
const previewInitial: InstructorPreviewState = {};
const csvInitial: ClassInstructorCsvState = {};

export function ClassInstructorsClient({
  unitId,
  classId,
  instructors,
  library,
}: {
  unitId: string;
  classId: string;
  instructors: ClassInstructorRow[];
  library: LibraryInstructor[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"library" | "new" | "csv">("library");

  return (
    <div>
      {instructors.length === 0 ? (
        <p className="footnote" style={{ marginBottom: 12 }}>ยังไม่มีผู้สอนในชั้นเรียนนี้</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {instructors.map((i) => (
            <div key={i.instructor_id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="pill study">{i.name}</span>
              <span className="footnote">{i.role_in_class ?? "วิทยากร"}{i.is_lead ? " · หัวหน้าผู้สอน" : ""}</span>
              <RemoveBtn unitId={unitId} classId={classId} instructorId={i.instructor_id} onDone={() => router.refresh()} />
            </div>
          ))}
        </div>
      )}

      <button className="btn primary" onClick={() => { setTab(library.length > 0 ? "library" : "new"); setOpen(true); }}>
        + เพิ่มผู้สอน
      </button>

      <Popup open={open} onClose={() => setOpen(false)} title="เพิ่มผู้สอนเข้าชั้นเรียน" maxWidth={620}>
        <div className="sheet-tabs" style={{ marginBottom: 14 }}>
          <button className={`sheet-tab ${tab === "library" ? "active" : ""}`} onClick={() => setTab("library")}>เลือกจากคลัง</button>
          <button className={`sheet-tab ${tab === "new" ? "active" : ""}`} onClick={() => setTab("new")}>เพิ่มคนใหม่</button>
          <button className={`sheet-tab ${tab === "csv" ? "active" : ""}`} onClick={() => setTab("csv")}>นำเข้า CSV</button>
        </div>
        {tab === "library" && (
          <FromLibrary unitId={unitId} classId={classId} library={library} onDone={() => { setOpen(false); router.refresh(); }} />
        )}
        {tab === "new" && (
          <NewInstructor unitId={unitId} classId={classId} onDone={() => { setOpen(false); router.refresh(); }} />
        )}
        {tab === "csv" && (
          <InstructorCsvToClass unitId={unitId} classId={classId} onDone={() => router.refresh()} />
        )}
      </Popup>
    </div>
  );
}

function RemoveBtn({ unitId, classId, instructorId, onDone }: { unitId: string; classId: string; instructorId: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn secondary"
      style={{ padding: "2px 8px", fontSize: 12, color: "var(--danger)" }}
      disabled={pending}
      onClick={() => start(async () => { await removeInstructorFromClass(unitId, classId, instructorId); onDone(); })}
    >
      {pending ? "..." : "นำออก"}
    </button>
  );
}

function FromLibrary({ unitId, classId, library, onDone }: { unitId: string; classId: string; library: LibraryInstructor[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(addInstructorsFromLibrary, linkInitial);
  useEffect(() => { if (state.success) onDone(); }, [state.success, onDone]);

  if (library.length === 0) {
    return <p className="footnote">วิทยากรในคลังถูกเพิ่มเข้าชั้นเรียนนี้หมดแล้ว — เพิ่มคนใหม่หรือไปที่คลังวิทยากร</p>;
  }
  return (
    <form action={action} style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      <input type="hidden" name="class_id" value={classId} />
      <label>
        <span className="field-label">บทบาทในชั้นเรียน</span>
        <input name="role_in_class" className="field" placeholder="วิทยากร" defaultValue="วิทยากร" />
      </label>
      <div style={{ display: "grid", gap: 6, maxHeight: 280, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
        {library.map((l) => (
          <label key={l.instructor_id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" name="instructor_id" value={l.instructor_id} />
            <span>{l.name}{l.phone ? ` · ${l.phone}` : ""}</span>
          </label>
        ))}
      </div>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังเพิ่ม..." : "เพิ่มที่เลือกเข้าชั้นเรียน"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}

function NewInstructor({ unitId, classId, onDone }: { unitId: string; classId: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(createInstructorInClass, linkInitial);
  useEffect(() => { if (state.success) onDone(); }, [state.success, onDone]);
  return (
    <form action={action} style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="unit_id" value={unitId} />
      <input type="hidden" name="class_id" value={classId} />
      <p className="footnote">วิทยากรที่เพิ่มใหม่จะถูกบันทึกเข้าคลังของหน่วยด้วย</p>
      <label><span className="field-label">ชื่อวิทยากร</span><input name="name" required className="field" /></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label><span className="field-label">เบอร์โทร</span><input name="phone" className="field" /></label>
        <label><span className="field-label">อีเมล</span><input name="email" type="email" className="field" /></label>
      </div>
      <label><span className="field-label">บทบาทในชั้นเรียน</span><input name="role_in_class" className="field" placeholder="วิทยากร" defaultValue="วิทยากร" /></label>
      <button type="submit" className="btn primary" disabled={pending}>{pending ? "กำลังเพิ่ม..." : "เพิ่มผู้สอน"}</button>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}

function InstructorCsvToClass({ unitId, classId, onDone }: { unitId: string; classId: string; onDone: () => void }) {
  const [preview, previewAction, previewPending] = useActionState(previewInstructorImport, previewInitial);
  const [commit, commitAction, commitPending] = useActionState(commitClassInstructorImport, csvInitial);

  if (commit.linked !== undefined) {
    onDone();
    return <p className="notice success">เพิ่มผู้สอนเข้าชั้นเรียน {commit.linked} คน (สร้างใหม่ในคลัง {commit.created} คน)</p>;
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <FieldSpecTable
        specs={[
          { field: "name", type: "ข้อความ", required: true },
          { field: "phone", type: "ข้อความ (ตัวเลข)", required: false },
          { field: "email", type: "ข้อความ (อีเมล)", required: false },
        ]}
      />
      <a href="/api/import-template/instructors" className="footnote">ดาวน์โหลดเทมเพลต CSV</a>
      {!preview.rows ? (
        <form action={previewAction} style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <input name="file" type="file" accept=".csv" required className="field" />
          <button type="submit" className="btn primary" disabled={previewPending}>{previewPending ? "กำลังตรวจสอบ..." : "ตรวจสอบไฟล์"}</button>
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
                    <td>{r.rowNumber}</td><td>{r.name}</td>
                    <td><span className={`pill ${r.status === "pass" ? "done" : "fail"}`}>{r.status === "pass" ? "ผ่าน" : "ไม่ผ่าน"}</span></td>
                    <td>{r.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.passCount! > 0 && (
            <form action={commitAction} style={{ display: "grid", gap: 8 }}>
              <input type="hidden" name="unit_id" value={unitId} />
              <input type="hidden" name="class_id" value={classId} />
              <input type="hidden" name="rows" value={JSON.stringify(preview.rows)} />
              <label><span className="field-label">บทบาทในชั้นเรียน</span><input name="role_in_class" className="field" defaultValue="วิทยากร" /></label>
              <button type="submit" className="btn primary" disabled={commitPending}>{commitPending ? "กำลังนำเข้า..." : `เพิ่ม ${preview.passCount} คนเข้าชั้นเรียน`}</button>
            </form>
          )}
          {commit.error && <p className="notice error">{commit.error}</p>}
        </>
      )}
    </div>
  );
}
