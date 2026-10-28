"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popup } from "@/components/ui/Popup";
import { FieldSpecTable } from "@/components/ui/FieldSpec";
import { classStatusDisplay } from "@/lib/class-status";
import { type ConfirmedRound } from "@/lib/participation";
import { ClassForm } from "./class-form";
import {
  previewClassImport,
  commitClassImport,
  type PreviewState as ClassPreviewState,
  type CommitState as ClassCommitState,
} from "../import-classes/actions";

export type ClassRow = {
  class_id: string;
  batch_code: string | null;
  name: string | null;
  course_name: string;
  status: string;
  start_date: string;
  end_date: string;
  schedule_time: string | null;
  seat_count: number;
  learner_count: number;
  instructor_count: number;
  lead_instructor_name: string | null;
};

type Course = { course_id: string; name: string };
type Instructor = { instructor_id: string; name: string };

export function ClassList({
  unitId,
  isStaff,
  courses,
  instructors,
  classes,
  confirmedRounds,
}: {
  unitId: string;
  isStaff: boolean;
  courses: Course[];
  instructors: Instructor[];
  classes: ClassRow[];
  confirmedRounds: ConfirmedRound[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const canCreate = confirmedRounds.length > 0;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return classes;
    return classes.filter((c) =>
      `${c.batch_code ?? ""} ${c.course_name} ${c.name ?? ""}`.toLowerCase().includes(term),
    );
  }, [q, classes]);

  const detailHref = (classId: string) =>
    `/unit/classes/${classId}${isStaff ? `?unit_id=${unitId}` : ""}`;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <input
          className="field"
          placeholder="ค้นหารหัสรุ่น / หลักสูตร / ชื่อรุ่น"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <span className="footnote" style={{ marginRight: "auto" }}>
          {filtered.length} / {classes.length} ชั้นเรียน
        </span>
        <button className="btn secondary" onClick={() => setCsvOpen(true)} disabled={!canCreate}>นำเข้าชั้นเรียน CSV</button>
        <button className="btn primary" onClick={() => setCreateOpen(true)} disabled={!canCreate}>+ สร้างชั้นเรียน</button>
      </div>

      {!canCreate && (
        <p className="notice" style={{ background: "#fff3da", color: "#76520c", border: "1px solid #f0d9a6", marginBottom: 16 }}>
          หน่วยนี้ยังไม่ได้ยืนยันเข้าร่วมปีงบประมาณใด จึงยังสร้างชั้นเรียนไม่ได้ — ต้องรอ Web Master เปิดรอบ
          แล้วกด&ldquo;ยืนยันการเข้าร่วม&rdquo;ที่เมนู <strong>ยืนยันการเข้าร่วมปีงบ</strong> ก่อน
        </p>
      )}

      {classes.length === 0 && <p className="footnote">ยังไม่มีชั้นเรียน — กด&ldquo;สร้างชั้นเรียน&rdquo;เพื่อเริ่ม</p>}

      <div className="unit-list">
        {filtered.map((c) => (
          <Link key={c.class_id} href={detailHref(c.class_id)} className="class-row">
            <div className="class-row-code">{c.batch_code ?? "—"}</div>
            <div className="class-row-main">
              <strong>
                {c.course_name}
                {c.name ? ` · ${c.name}` : ""}
              </strong>
              <div className="footnote" style={{ marginTop: 3 }}>
                {c.start_date} – {c.end_date}
                {c.schedule_time ? ` · ${c.schedule_time}` : ""}
                {c.lead_instructor_name ? ` · หัวหน้าผู้สอน: ${c.lead_instructor_name}` : ""}
              </div>
            </div>
            <div className="class-row-meta">
              {(() => {
                const s = classStatusDisplay(c.start_date, c.end_date);
                return <span className={`pill ${s.pill}`}>{s.label}</span>;
              })()}
              <span className="footnote">
                ผู้เรียน {c.learner_count}/{c.seat_count} · ผู้สอน {c.instructor_count}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <Popup open={createOpen} onClose={() => setCreateOpen(false)} title="สร้างชั้นเรียนใหม่" maxWidth={560}>
        <ClassForm
          unitId={unitId}
          courses={courses}
          instructors={instructors}
          confirmedRounds={confirmedRounds}
          onDone={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      </Popup>

      <Popup open={csvOpen} onClose={() => setCsvOpen(false)} title="นำเข้าชั้นเรียนจากไฟล์ CSV" maxWidth={680}>
        <ClassCsv unitId={unitId} fiscalYear={confirmedRounds[0]?.fiscal_year ?? null} onImported={() => router.refresh()} />
      </Popup>
    </div>
  );
}

const classPreviewInitial: ClassPreviewState = {};
const classCommitInitial: ClassCommitState = {};

function ClassCsv({ unitId, fiscalYear, onImported }: { unitId: string; fiscalYear: number | null; onImported: () => void }) {
  const [preview, previewAction, previewPending] = useActionState(previewClassImport, classPreviewInitial);
  const [commit, commitAction, commitPending] = useActionState(commitClassImport, classCommitInitial);

  if (commit.created !== undefined) {
    onImported();
    return <p className="notice success">นำเข้าชั้นเรียนแล้ว {commit.created} รายการ (ระบบกำหนดรหัสรุ่นให้อัตโนมัติ)</p>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {fiscalYear != null && (
        <p className="footnote">ชั้นเรียนที่นำเข้าจะถูกผูกกับ <strong>ปีงบประมาณ {fiscalYear}</strong> (ปีล่าสุดที่หน่วยยืนยันเข้าร่วม)</p>
      )}
      <FieldSpecTable
        specs={[
          { field: "course_name", type: "ข้อความ", required: true, note: "ต้องตรงกับชื่อหลักสูตรที่มีอยู่แล้ว" },
          { field: "start_date", type: "วันที่ YYYY-MM-DD", required: true },
          { field: "end_date", type: "วันที่ YYYY-MM-DD", required: true, note: "ต้องไม่น้อยกว่าวันเริ่ม" },
          { field: "seat_count", type: "จำนวนเต็มบวก", required: true },
          { field: "external_ref", type: "ข้อความ", required: false, note: "รหัสอ้างอิงเดิม (ถ้ามี)" },
        ]}
      />
      <a href="/api/import-template/classes" className="footnote">ดาวน์โหลดเทมเพลต CSV</a>

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
              <thead><tr><th>แถว</th><th>หลักสูตร</th><th>ช่วงวันที่</th><th>สถานะ</th><th>สาเหตุ</th></tr></thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber}>
                    <td>{r.rowNumber}</td>
                    <td>{r.course_name}</td>
                    <td>{r.start_date}–{r.end_date}</td>
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
                {commitPending ? "กำลังนำเข้า..." : `นำเข้า ${preview.passCount} ชั้นเรียน`}
              </button>
            </form>
          )}
          {commit.error && <p className="notice error">{commit.error}</p>}
        </>
      )}
    </div>
  );
}
