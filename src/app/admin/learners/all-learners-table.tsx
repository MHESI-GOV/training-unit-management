"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RevealIdButton } from "@/app/unit/learners/reveal-id-button";
import { NationalIdSearch } from "@/app/unit/learners/national-id-search";
import { ExportLearners } from "@/components/dashboard/export-learners";
import { LEARNER_STATUS_DISPLAY } from "@/lib/learner-status";
import type { AllLearnerRow } from "@/app/unit/learners/load-learners";

type UnitOption = { unit_id: string; name: string };
type StandardOption = { value: string; label: string };

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

// Cross-unit learner database for Web Master / Central Staff. Same filters as the per-unit table
// plus a หน่วยฝึกอบรม column + unit filter, so you can answer "this learner — which unit / รุ่น / ปีงบ".
export function AllLearnersTable({
  learners,
  units,
  standards,
  fiscalYears,
}: {
  learners: AllLearnerRow[];
  units: UnitOption[];
  standards: StandardOption[];
  fiscalYears: number[];
}) {
  const [q, setQ] = useState("");
  const [unitId, setUnitId] = useState("");
  const [status, setStatus] = useState("");
  const [standard, setStandard] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const min = ageMin ? Number(ageMin) : null;
    const max = ageMax ? Number(ageMax) : null;
    const fy = fiscalYear ? Number(fiscalYear) : null;
    return learners.filter((l) => {
      if (term && !`${l.first_name} ${l.last_name} ${l.phone ?? ""} ${l.email ?? ""} ${l.unit_name}`.toLowerCase().includes(term)) return false;
      if (unitId && l.unit_id !== unitId) return false;
      if (fy !== null && !l.enrollments.some((e) => e.fiscalYear === fy)) return false;
      if (status === "none") {
        if (l.enrollments.length > 0) return false;
      } else if (status && !l.enrollments.some((e) => e.status === status)) return false;
      if (standard && !l.standards.some((s) => s.standard_type === standard)) return false;
      if (min !== null && (l.age === null || l.age < min)) return false;
      if (max !== null && (l.age === null || l.age > max)) return false;
      return true;
    });
  }, [q, unitId, status, standard, ageMin, ageMax, fiscalYear, learners]);

  function exportFiltered() {
    const header = ["ชื่อ", "นามสกุล", "หน่วยฝึกอบรม", "เพศ", "อาชีพ", "อายุ", "เบอร์โทร", "อีเมล", "รุ่น · ปีงบ · สถานะการเรียน", "มาตรฐานที่ได้รับ"];
    const body = filtered.map((l) => [
      l.first_name,
      l.last_name,
      l.unit_name,
      l.gender,
      l.occupation,
      l.age === null ? "" : String(l.age),
      l.phone ?? "",
      l.email ?? "",
      l.enrollments.map((e) => `${e.courseLabel}${e.fiscalYear ? ` · ปีงบ ${e.fiscalYear}` : ""} [${e.statusLabel}]`).join("; "),
      l.standards.map((s) => s.label).join("; "),
    ]);
    downloadCsv(`learners_all_units_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body]);
  }

  const resetBtn = q || unitId || status || standard || ageMin || ageMax || fiscalYear;

  return (
    <div>
      <NationalIdSearch isStaff />

      <div className="filter-bar">
        <input className="field" placeholder="ค้นหาชื่อ / เบอร์ / อีเมล / หน่วย" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          <option value="">ทุกหน่วยฝึกอบรม</option>
          {units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.name}</option>)}
        </select>
        <select className="field" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}>
          <option value="">ทุกปีงบประมาณ</option>
          {fiscalYears.map((y) => <option key={y} value={y}>ปีงบประมาณ {y}</option>)}
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
          <button className="btn secondary" onClick={() => { setQ(""); setUnitId(""); setStatus(""); setStandard(""); setAgeMin(""); setAgeMax(""); setFiscalYear(""); }}>
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, margin: "12px 0" }}>
        <span className="footnote">แสดง {filtered.length} / {learners.length} คน · {units.length} หน่วย</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn secondary" onClick={exportFiltered} disabled={filtered.length === 0}>
            ส่งออกตามตัวกรอง (CSV · ไม่มีเลขบัตร)
          </button>
          <ExportLearners unitId="" />
        </div>
      </div>

      {learners.length === 0 && <p className="footnote">ยังไม่มีข้อมูลผู้เรียนในระบบ</p>}

      {learners.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ-นามสกุล</th>
                <th>หน่วยฝึกอบรม</th>
                <th>อายุ</th>
                <th>เลขบัตรประชาชน</th>
                <th>รุ่น / ปีงบ / สถานะการเรียน</th>
                <th>มาตรฐานที่ได้รับ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.learner_id}>
                  <td>
                    <Link href={`/unit/learners/${l.learner_id}?unit_id=${l.unit_id}`}>
                      <strong>{l.first_name} {l.last_name}</strong>
                    </Link>
                    {(l.phone || l.email) && (
                      <div className="footnote" style={{ marginTop: 2 }}>
                        {l.phone}{l.phone && l.email ? " · " : ""}{l.email}
                      </div>
                    )}
                  </td>
                  <td>{l.unit_name}</td>
                  <td>{l.age === null ? "—" : `${l.age} ปี`}</td>
                  <td>
                    <RevealIdButton unitId={l.unit_id} learnerId={l.learner_id} />
                  </td>
                  <td>
                    {l.enrollments.length === 0 && <span className="pill muted">ยังไม่ลงรุ่น</span>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {l.enrollments.map((e, i) => (
                        <span key={i} style={{ fontSize: 13 }}>
                          <span className={`pill ${e.statusPill}`}>{e.statusLabel}</span> {e.courseLabel}
                          {e.fiscalYear ? <span className="footnote"> · ปีงบ {e.fiscalYear}</span> : null}
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
