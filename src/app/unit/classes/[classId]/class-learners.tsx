"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Popup } from "@/components/ui/Popup";
import { FieldSpecTable } from "@/components/ui/FieldSpec";
import { ENROLL_STATUS_LABEL, ENROLL_STATUS_PILL } from "@/lib/labels";
import { RevealIdButton } from "../../learners/reveal-id-button";
import { AssessmentForm } from "../../learners/assessment-form";
import { markEnrollmentOutcome } from "../../learners/actions";
import { LearnerForm } from "../../learners/learner-form";
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
  first_name: string;
  last_name: string;
  masked_id: string;
  age: number | null;
  status: string;
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
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"single" | "csv">("single");
  const [assessOpen, setAssessOpen] = useState(false);
  const [assessTarget, setAssessTarget] = useState<ClassLearnerRow | null>(null);

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

      {learners.length === 0 && <p className="footnote">ยังไม่มีผู้เรียนในชั้นเรียนนี้</p>}

      {learners.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ-นามสกุล</th>
                <th>อายุ</th>
                <th>เลขบัตร</th>
                <th>สถานะการเรียน</th>
                <th>มาตรฐานที่ได้รับ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.enrollment_id}>
                  <td><strong>{l.first_name} {l.last_name}</strong></td>
                  <td>{l.age === null ? "—" : `${l.age} ปี`}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{l.masked_id}</span>
                      <RevealIdButton unitId={unitId} learnerId={l.learner_id} />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                      <span className={`pill ${ENROLL_STATUS_PILL[l.status] ?? "pending"}`}>{ENROLL_STATUS_LABEL[l.status] ?? l.status}</span>
                      {(l.status === "applied" || l.status === "attending") && (
                        <span style={{ display: "flex", gap: 6 }}>
                          <OutcomeBtn unitId={unitId} enrollmentId={l.enrollment_id} outcome="completed" label="สำเร็จ" onDone={() => router.refresh()} />
                          <OutcomeBtn unitId={unitId} enrollmentId={l.enrollment_id} outcome="failed" label="ไม่สำเร็จ" onDone={() => router.refresh()} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {l.standards.length === 0 && <span className="pill muted">—</span>}
                      {l.standards.map((s) => (
                        <span key={s.result_id} className={`pill ${s.result === "passed" ? "done" : s.result === "failed" ? "fail" : "pending"}`}>
                          {s.label}
                        </span>
                      ))}
                      <button className="btn secondary" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => setAssessTarget(l)}>
                        + บันทึกผล
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add learners (single / CSV) */}
      <Popup open={addOpen} onClose={() => setAddOpen(false)} title={`เพิ่มผู้เรียนลงชั้นเรียน ${classLabel}`} maxWidth={620}>
        <div className="sheet-tabs" style={{ marginBottom: 14 }}>
          <button className={`sheet-tab ${addTab === "single" ? "active" : ""}`} onClick={() => setAddTab("single")}>เพิ่มทีละคน</button>
          <button className={`sheet-tab ${addTab === "csv" ? "active" : ""}`} onClick={() => setAddTab("csv")}>นำเข้า CSV</button>
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
                { field: "birth_date", type: "วันที่ YYYY-MM-DD", required: false, note: "ใช้คำนวณอายุ" },
                { field: "phone", type: "ข้อความ", required: false },
                { field: "email", type: "ข้อความ (อีเมล)", required: false },
                { field: "address", type: "ข้อความ", required: false },
              ]}
            />
            <ImportClient unitId={unitId} classId={classId} classLabel={classLabel} />
          </>
        )}
      </Popup>

      {/* Record one learner's assessment result */}
      <Popup open={!!assessTarget} onClose={() => setAssessTarget(null)} title={assessTarget ? `บันทึกผล/มาตรฐาน — ${assessTarget.first_name} ${assessTarget.last_name}` : ""} maxWidth={560}>
        {assessTarget && <AssessmentForm unitId={unitId} learnerId={assessTarget.learner_id} />}
      </Popup>

      {/* Bulk assessment CSV */}
      <Popup open={assessOpen} onClose={() => setAssessOpen(false)} title="นำเข้าผลทดสอบมาตรฐานจากไฟล์ CSV" maxWidth={680}>
        <AssessmentCsv unitId={unitId} onDone={() => router.refresh()} />
      </Popup>
    </div>
  );
}

function OutcomeBtn({ unitId, enrollmentId, outcome, label, onDone }: { unitId: string; enrollmentId: string; outcome: "completed" | "failed"; label: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn secondary"
      style={{ padding: "3px 10px", fontSize: 12 }}
      disabled={pending}
      onClick={() => start(async () => { await markEnrollmentOutcome(unitId, enrollmentId, outcome); onDone(); })}
    >
      {pending ? "..." : label}
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
          { field: "tested_at", type: "วันที่ YYYY-MM-DD", required: false },
          { field: "evidence_ref", type: "ข้อความ", required: false },
        ]}
      />
      <a href="/api/import-template/assessments" className="footnote">ดาวน์โหลดเทมเพลต CSV</a>
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
