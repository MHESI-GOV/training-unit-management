"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RevealIdButton } from "./reveal-id-button";
import { LEARNER_STATUS_DISPLAY } from "@/lib/learner-status";

export type LearnerRow = {
  learner_id: string;
  first_name: string;
  last_name: string;
  masked_id: string;
  age: number | null;
  phone: string | null;
  email: string | null;
  enrollments: { statusLabel: string; statusPill: string; courseLabel: string; class_id: string; status: string }[];
  standards: { label: string; pill: string; standard_type: string }[];
};

type ClassOption = { class_id: string; label: string };
type StandardOption = { value: string; label: string };

// Minimal CSV builder for the client-side report export (name/age/contact/classes/standards — no
// national ID; full-PII export stays a staff-only server route).
function downloadCsv(filename: string, rows: string[][]) {
  const esc = (v: string) => {
    const s = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function LearnersTable({
  unitId,
  learners,
  classes,
  standards,
}: {
  unitId: string;
  learners: LearnerRow[];
  classes: ClassOption[];
  standards: StandardOption[];
}) {
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [standard, setStandard] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const min = ageMin ? Number(ageMin) : null;
    const max = ageMax ? Number(ageMax) : null;
    return learners.filter((l) => {
      if (term && !`${l.first_name} ${l.last_name} ${l.phone ?? ""} ${l.email ?? ""}`.toLowerCase().includes(term)) return false;
      if (classId && !l.enrollments.some((e) => e.class_id === classId)) return false;
      if (status === "none") {
        if (l.enrollments.length > 0) return false;
      } else if (status && !l.enrollments.some((e) => e.status === status)) return false;
      if (standard && !l.standards.some((s) => s.standard_type === standard)) return false;
      if (min !== null && (l.age === null || l.age < min)) return false;
      if (max !== null && (l.age === null || l.age > max)) return false;
      return true;
    });
  }, [q, classId, status, standard, ageMin, ageMax, learners]);

  function exportReport() {
    const header = ["ชื่อ", "นามสกุล", "อายุ", "เบอร์โทร", "อีเมล", "รุ่น/สถานะการเรียน", "มาตรฐานที่ได้รับ"];
    const body = filtered.map((l) => [
      l.first_name,
      l.last_name,
      l.age === null ? "" : String(l.age),
      l.phone ?? "",
      l.email ?? "",
      l.enrollments.map((e) => `${e.courseLabel} [${e.statusLabel}]`).join("; "),
      l.standards.map((s) => s.label).join("; "),
    ]);
    downloadCsv(`learners_report_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body]);
  }

  const resetBtn = q || classId || status || standard || ageMin || ageMax;

  return (
    <div>
      <div className="filter-bar">
        <input className="field" placeholder="ค้นหาชื่อ / เบอร์ / อีเมล" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">ทุกชั้นเรียน</option>
          {classes.map((c) => <option key={c.class_id} value={c.class_id}>{c.label}</option>)}
        </select>
        <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">ทุกสถานะการเรียน</option>
          {Object.entries(LEARNER_STATUS_DISPLAY).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          <option value="none">ยังไม่ลงรุ่น</option>
        </select>
        <select className="field" value={standard} onChange={(e) => setStandard(e.target.value)}>
          <option value="">ทุกมาตรฐาน</option>
          {standards.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input className="field" type="number" min={0} placeholder="อายุต่ำสุด" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} style={{ maxWidth: 110 }} />
        <input className="field" type="number" min={0} placeholder="อายุสูงสุด" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} style={{ maxWidth: 110 }} />
        {resetBtn && (
          <button className="btn secondary" onClick={() => { setQ(""); setClassId(""); setStatus(""); setStandard(""); setAgeMin(""); setAgeMax(""); }}>
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, margin: "12px 0" }}>
        <span className="footnote">แสดง {filtered.length} / {learners.length} คน</span>
        <button className="btn secondary" onClick={exportReport} disabled={filtered.length === 0}>
          ส่งออกรายงาน (CSV)
        </button>
      </div>

      {learners.length === 0 && (
        <p className="footnote">ยังไม่มีผู้เรียน — บันทึกผู้เรียนผ่านเมนู &ldquo;จัดการชั้นเรียน&rdquo; (เพิ่มลงในชั้นเรียน)</p>
      )}

      {learners.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ-นามสกุล</th>
                <th>อายุ</th>
                <th>เลขบัตรประชาชน</th>
                <th>รุ่น / สถานะการเรียน</th>
                <th>มาตรฐานที่ได้รับ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.learner_id}>
                  <td>
                    <Link href={`/unit/learners/${l.learner_id}?unit_id=${unitId}`}>
                      <strong>{l.first_name} {l.last_name}</strong>
                    </Link>
                    {(l.phone || l.email) && (
                      <div className="footnote" style={{ marginTop: 2 }}>
                        {l.phone}{l.phone && l.email ? " · " : ""}{l.email}
                      </div>
                    )}
                  </td>
                  <td>{l.age === null ? "—" : `${l.age} ปี`}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{l.masked_id}</span>
                      <RevealIdButton unitId={unitId} learnerId={l.learner_id} />
                    </div>
                  </td>
                  <td>
                    {l.enrollments.length === 0 && <span className="pill muted">ยังไม่ลงรุ่น</span>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {l.enrollments.map((e, i) => (
                        <span key={i} style={{ fontSize: 13 }}>
                          <span className={`pill ${e.statusPill}`}>{e.statusLabel}</span> {e.courseLabel}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {l.standards.length === 0 && <span className="pill muted">—</span>}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {l.standards.map((s, i) => <span key={i} className={`pill ${s.pill}`}>{s.label}</span>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
