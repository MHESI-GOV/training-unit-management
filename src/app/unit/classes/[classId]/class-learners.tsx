"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Popup } from "@/components/ui/Popup";
import { FieldSpecTable } from "@/components/ui/FieldSpec";
import { GENDER_LABEL } from "@/lib/labels";
import { formatThaiDate } from "@/lib/date-format";
import { RevealIdButton } from "../../learners/reveal-id-button";
import { LearnerForm, type LearnerEdit } from "../../learners/learner-form";
import { submitClassResults, setEnrollmentWithdrawn, type ClassResultRow } from "../../learners/actions";
import { ImportClient } from "../../import/import-client";
import {
  previewAssessmentImport,
  commitAssessmentImport,
  type PreviewState as AssessPreview,
  type CommitState as AssessCommit,
} from "../../import-assessments/actions";

export type ClassLearnerRow = {
  enrollment_id: string;
  learner_id: string;
  student_code: string | null;
  first_name: string;
  last_name: string;
  gender: string | null;
  masked_id: string;
  birth_date: string | null;
  age: number | null;
  email: string | null;
  address: string | null;
  occupation: string | null;
  status: string;
  course_pass: boolean;
  dsd_l1_passed: boolean;
  food_contact_passed: boolean;
  standards: { result_id: string; label: string; result: string; tested_at: string | null }[];
};

export function ClassLearnersClient({
  unitId,
  classId,
  classLabel,
  learners,
}: {
  unitId: string;
  classId: string;
  classLabel: string;
  learners: ClassLearnerRow[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"info" | "results">("info");
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"single" | "csv">("single");
  const [assessOpen, setAssessOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassLearnerRow | null>(null);

  // Tab-2 batch recording: view mode until "เริ่มบันทึกผล", then an editable draft submitted once.
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<Record<string, { course_pass: boolean; dsd_l1: boolean; food_contact: boolean }>>({});
  const [submitting, startSubmit] = useTransition();

  function startRecording() {
    const d: typeof draft = {};
    for (const l of learners) {
      if (l.status === "withdrawn") continue;
      d[l.enrollment_id] = { course_pass: l.course_pass, dsd_l1: l.dsd_l1_passed, food_contact: l.food_contact_passed };
    }
    setDraft(d);
    setRecording(true);
  }

  function submitResults() {
    const rows: ClassResultRow[] = learners
      .filter((l) => l.status !== "withdrawn" && draft[l.enrollment_id])
      .map((l) => ({ enrollment_id: l.enrollment_id, learner_id: l.learner_id, ...draft[l.enrollment_id] }));
    startSubmit(async () => {
      await submitClassResults(unitId, classId, rows);
      setRecording(false);
      router.refresh();
    });
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return learners;
    return learners.filter((l) => `${l.first_name} ${l.last_name}`.toLowerCase().includes(term));
  }, [q, learners]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <input className="field" placeholder="ค้นหาชื่อผู้เรียน" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
        <span className="footnote" style={{ marginRight: "auto" }}>{filtered.length} / {learners.length} คน</span>
        <button className="btn secondary" onClick={() => setAssessOpen(true)}>นำเข้าผลทดสอบ CSV</button>
        <button className="btn primary" onClick={() => { setAddTab("single"); setAddOpen(true); }}>+ เพิ่มผู้เรียน</button>
      </div>

      <div className="sheet-tabs" style={{ marginBottom: 14 }}>
        <button className={`sheet-tab ${tab === "info" ? "active" : ""}`} onClick={() => setTab("info")}>ข้อมูลทั่วไป</button>
        <button className={`sheet-tab ${tab === "results" ? "active" : ""}`} onClick={() => setTab("results")}>บันทึกผลการเรียน</button>
      </div>

      {learners.length === 0 && <p className="footnote">ยังไม่มีผู้เรียนในชั้นเรียนนี้</p>}

      {/* ── Tab 1: general info ── */}
      {learners.length > 0 && tab === "info" && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>รหัสผู้เรียน</th>
                <th>ชื่อ-สกุล</th>
                <th>เพศ</th>
                <th>เลขบัตร</th>
                <th>วันเกิด</th>
                <th>อายุ</th>
                <th>อีเมล</th>
                <th>ที่อยู่</th>
                <th>อาชีพ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.enrollment_id}>
                  <td style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{l.student_code ?? "—"}</td>
                  <td><strong>{l.first_name} {l.last_name}</strong></td>
                  <td>{l.gender ? GENDER_LABEL[l.gender] ?? "—" : "—"}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{l.masked_id}</span>
                      <RevealIdButton unitId={unitId} learnerId={l.learner_id} />
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatThaiDate(l.birth_date)}</td>
                  <td>{l.age === null ? "—" : `${l.age} ปี`}</td>
                  <td>{l.email ?? "—"}</td>
                  <td style={{ maxWidth: 220 }}>{l.address ?? "—"}</td>
                  <td>{l.occupation ?? "—"}</td>
                  <td>
                    <button className="icon-btn" data-tip="แก้ไขข้อมูลผู้เรียน" aria-label="แก้ไขข้อมูลผู้เรียน" onClick={() => setEditTarget(l)}>
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab 2: record results — view until "เริ่มบันทึกผล", then one batch submit ── */}
      {learners.length > 0 && tab === "results" && (
        <div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            {!recording ? (
              <button className="btn primary" onClick={startRecording}>เริ่มบันทึกผล</button>
            ) : (
              <>
                <span className="footnote" style={{ marginRight: "auto" }}>ติ๊กผลการเรียนแล้วกด &ldquo;ส่งผลการเรียน&rdquo; เพื่อบันทึกทั้งหมดในครั้งเดียว</span>
                <button className="btn secondary" onClick={() => setRecording(false)} disabled={submitting}>ยกเลิก</button>
                <button className="btn primary" onClick={submitResults} disabled={submitting}>
                  {submitting ? "กำลังส่ง..." : "ส่งผลการเรียน"}
                </button>
              </>
            )}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ชื่อ-สกุล</th>
                  <th style={{ textAlign: "center" }}>ผ่านเกณฑ์หลักสูตร</th>
                  <th style={{ textAlign: "center" }}>ผ่านมาตรฐานฝีมือแรงงาน ระดับ 1<br />สาขาผู้ประกอบอาหารไทย</th>
                  <th style={{ textAlign: "center" }}>ใบรับรองผู้สัมผัสอาหาร</th>
                  <th style={{ textAlign: "right" }}>การถอนตัว</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const withdrawn = l.status === "withdrawn";
                  const d = draft[l.enrollment_id];
                  const cell = (checked: boolean, onChange: (v: boolean) => void) =>
                    withdrawn ? (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    ) : recording ? (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                        style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--blue)" }}
                      />
                    ) : (
                      <ResultMark on={checked} />
                    );
                  return (
                    <tr key={l.enrollment_id} style={withdrawn ? { opacity: 0.6 } : undefined}>
                      <td>
                        <strong>{l.first_name} {l.last_name}</strong>
                        {withdrawn && <span className="pill fail" style={{ marginLeft: 8 }}>ถอนตัว</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {cell(d ? d.course_pass : l.course_pass, (v) => setDraft((s) => ({ ...s, [l.enrollment_id]: { ...s[l.enrollment_id], course_pass: v } })))}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {cell(d ? d.dsd_l1 : l.dsd_l1_passed, (v) => setDraft((s) => ({ ...s, [l.enrollment_id]: { ...s[l.enrollment_id], dsd_l1: v } })))}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {cell(d ? d.food_contact : l.food_contact_passed, (v) => setDraft((s) => ({ ...s, [l.enrollment_id]: { ...s[l.enrollment_id], food_contact: v } })))}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <WithdrawButton unitId={unitId} enrollmentId={l.enrollment_id} withdrawn={withdrawn} disabled={recording} onDone={() => router.refresh()} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add learners (single / CSV) */}
      <Popup open={addOpen} onClose={() => setAddOpen(false)} title={`เพิ่มผู้เรียนลงชั้นเรียน ${classLabel}`} maxWidth={620}>
        <div className="sheet-tabs" style={{ marginBottom: 14 }}>
          <button className={`sheet-tab ${addTab === "single" ? "active" : ""}`} onClick={() => setAddTab("single")}>เพิ่มทีละคน</button>
          <button className={`sheet-tab ${addTab === "csv" ? "active" : ""}`} onClick={() => setAddTab("csv")}>นำเข้าไฟล์</button>
        </div>
        {addTab === "single" ? (
          <LearnerForm unitId={unitId} classId={classId} />
        ) : (
          <>
            <FieldSpecTable
              specs={[
                { field: "first_name", type: "ข้อความ", required: true },
                { field: "last_name", type: "ข้อความ", required: true },
                { field: "national_id", type: "ตัวเลข 13 หลัก", required: true, note: "ไม่ซ้ำทั้งระบบ" },
                { field: "birth_date", type: "วันที่ YYYY-MM-DD (ค.ศ.)", required: false, note: "ใช้คำนวณอายุ" },
                { field: "phone", type: "ข้อความ", required: false },
                { field: "email", type: "ข้อความ (อีเมล)", required: false },
                { field: "address", type: "ข้อความ", required: false },
              ]}
            />
            <ImportClient unitId={unitId} classId={classId} classLabel={classLabel} />
          </>
        )}
      </Popup>

      {/* Edit one learner's general info (pencil icon on Tab 1) */}
      <Popup open={!!editTarget} onClose={() => setEditTarget(null)} title={editTarget ? `แก้ไขข้อมูลผู้เรียน — ${editTarget.first_name} ${editTarget.last_name}` : ""} maxWidth={620}>
        {editTarget && (
          <LearnerForm
            unitId={unitId}
            edit={{
              learner_id: editTarget.learner_id,
              first_name: editTarget.first_name,
              last_name: editTarget.last_name,
              gender: editTarget.gender,
              birth_date: editTarget.birth_date,
              phone: null,
              email: editTarget.email,
              address: editTarget.address,
              occupation: editTarget.occupation,
              masked_id: editTarget.masked_id,
            }}
            onDone={() => { setEditTarget(null); router.refresh(); }}
          />
        )}
      </Popup>

      {/* Bulk assessment CSV */}
      <Popup open={assessOpen} onClose={() => setAssessOpen(false)} title="นำเข้าผลทดสอบมาตรฐานจากไฟล์ CSV" maxWidth={680}>
        <AssessmentCsv unitId={unitId} onDone={() => router.refresh()} />
      </Popup>
    </div>
  );
}

// Read-only result mark (view mode): ✓ passed / — not yet.
function ResultMark({ on }: { on: boolean }) {
  return on ? (
    <span style={{ color: "#1baf7a", fontWeight: 700 }} aria-label="ผ่าน">✓</span>
  ) : (
    <span style={{ color: "var(--muted)" }} aria-label="ยังไม่ผ่าน">—</span>
  );
}

function WithdrawButton({
  unitId,
  enrollmentId,
  withdrawn,
  disabled,
  onDone,
}: {
  unitId: string;
  enrollmentId: string;
  withdrawn: boolean;
  disabled: boolean;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn secondary"
      style={{ padding: "3px 10px", fontSize: 12, color: withdrawn ? undefined : "var(--danger)" }}
      disabled={pending || disabled}
      onClick={() => start(async () => { await setEnrollmentWithdrawn(unitId, enrollmentId, !withdrawn); onDone(); })}
    >
      {pending ? "..." : withdrawn ? "ยกเลิกถอนตัว" : "ถอนตัว"}
    </button>
  );
}

const assessPreviewInitial: AssessPreview = {};
const assessCommitInitial: AssessCommit = {};

function AssessmentCsv({ unitId, onDone }: { unitId: string; onDone: () => void }) {
  const [preview, previewAction, previewPending] = useActionState(previewAssessmentImport, assessPreviewInitial);
  const [commit, commitAction, commitPending] = useActionState(commitAssessmentImport, assessCommitInitial);

  if (commit.created !== undefined) {
    onDone();
    return <p className="notice success">นำเข้าผลทดสอบแล้ว {commit.created} รายการ</p>;
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <FieldSpecTable
        specs={[
          { field: "national_id", type: "ตัวเลข 13 หลัก", required: true, note: "ต้องมีผู้เรียนนี้ในหน่วยแล้ว" },
          { field: "standard_type", type: "รหัส", required: true, note: "dsd_l1 / anamai_food_handler / anamai_food_contact / professional_qualification / other" },
          { field: "result", type: "รหัส", required: true, note: "passed / failed / pending" },
          { field: "tested_at", type: "วันที่ YYYY-MM-DD (ค.ศ.)", required: false },
          { field: "evidence_ref", type: "ข้อความ", required: false },
        ]}
      />
      <a href="/api/import-template/assessments" className="footnote">ดาวน์โหลดเทมเพลต (.xlsx มี dropdown)</a>
      {!preview.rows ? (
        <form action={previewAction} style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="unit_id" value={unitId} />
          <input name="file" type="file" accept=".csv,.xlsx" required className="field" />
          <button type="submit" className="btn primary" disabled={previewPending}>{previewPending ? "กำลังตรวจสอบ..." : "ตรวจสอบไฟล์"}</button>
          {preview.error && <p className="notice error">{preview.error}</p>}
        </form>
      ) : (
        <>
          <p>ผ่าน <strong>{preview.passCount}</strong> / ไม่ผ่าน <strong>{preview.failCount}</strong></p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>แถว</th><th>เลขบัตร</th><th>มาตรฐาน</th><th>สถานะ</th><th>สาเหตุ</th></tr></thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber}>
                    <td>{r.rowNumber}</td><td>{r.national_id}</td><td>{r.standard_type}</td>
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
              <button type="submit" className="btn primary" disabled={commitPending}>{commitPending ? "กำลังนำเข้า..." : `นำเข้า ${preview.passCount} รายการ`}</button>
            </form>
          )}
          {commit.error && <p className="notice error">{commit.error}</p>}
        </>
      )}
    </div>
  );
}
