"use client";

import { useState } from "react";
import Link from "next/link";
import { RevealIdButton } from "./reveal-id-button";
import { findLearnerByNationalId, type LearnerLookupResult } from "./actions";

// Exact-match lookup by full 13-digit national ID (hashed server-side). Coordinator finds only
// their own unit's learners; staff find across all units — enforced by RLS inside the action.
// Shared by the per-unit learners table and the all-units learner database page.
export function NationalIdSearch({ isStaff }: { isStaff: boolean }) {
  const [nid, setNid] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<LearnerLookupResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setResult(null);
    setMessage(null);
    try {
      const res = await findLearnerByNationalId(nid);
      if (res.result) setResult(res.result);
      else setMessage(res.error ?? "ไม่พบข้อมูล");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
      <div className="stat-label" style={{ fontWeight: 600, marginBottom: 10 }}>
        ค้นหาด้วยเลขบัตรประชาชน (13 หลัก{isStaff ? " · ค้นได้ทุกหน่วย" : " · เฉพาะหน่วยของคุณ"})
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); run(); }}
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
      >
        <input
          className="field"
          inputMode="numeric"
          pattern="\d{13}"
          maxLength={13}
          placeholder="กรอกเลขบัตร 13 หลัก"
          value={nid}
          onChange={(e) => setNid(e.target.value.replace(/\D/g, ""))}
          style={{ maxWidth: 220, fontVariantNumeric: "tabular-nums" }}
        />
        <button type="submit" className="btn primary" disabled={pending || nid.length !== 13}>
          {pending ? "กำลังค้นหา..." : "ค้นหา"}
        </button>
        {(result || message) && (
          <button type="button" className="btn secondary" onClick={() => { setResult(null); setMessage(null); setNid(""); }}>
            ล้าง
          </button>
        )}
      </form>

      {message && <p className="notice" style={{ marginTop: 12, marginBottom: 0 }}>{message}</p>}

      {result && (
        <div
          style={{
            marginTop: 12,
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "12px 14px",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <strong style={{ fontSize: 15 }}>{result.full_name}</strong>
            <RevealIdButton unitId={result.unit_id} learnerId={result.learner_id} />
          </div>
          <div className="footnote">หน่วยฝึกอบรม: <strong style={{ color: "var(--ink)" }}>{result.unit_name ?? "—"}</strong></div>
          {result.enrollments.length === 0 ? (
            <span className="pill muted">ยังไม่ลงรุ่น</span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {result.enrollments.map((e, i) => (
                <span key={i} style={{ fontSize: 13 }}>
                  <span className={`pill ${e.statusPill}`}>{e.statusLabel}</span>{" "}
                  {e.batch_code ? `${e.batch_code} · ` : ""}{e.course ?? "—"}
                  {e.fiscal_year ? <span className="footnote"> · ปีงบ {e.fiscal_year}</span> : null}
                </span>
              ))}
            </div>
          )}
          <div>
            <Link href={`/unit/learners/${result.learner_id}?unit_id=${result.unit_id}`} className="footnote">
              ดูรายละเอียดผู้เรียน →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
