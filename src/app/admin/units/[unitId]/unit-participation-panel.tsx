"use client";

import { useActionState, useRef, useState } from "react";
import { X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { adminConfirmParticipation, adminDeleteParticipation, type ConfirmParticipationState } from "../actions";

const initial: ConfirmParticipationState = {};

// Shows the years a unit confirmed. Staff can delete a mistaken year; only Web Master can record one
// (needed for historical units so the class-creation gate passes).
export function UnitParticipationPanel({
  unitId,
  confirmedYears,
  canRecord,
  defaultFiscalYear,
}: {
  unitId: string;
  confirmedYears: number[];
  canRecord: boolean;
  defaultFiscalYear: number;
}) {
  // One result line for all three actions, so an older message never sits beside a newer one.
  const [result, setResult] = useState<ConfirmParticipationState>(initial);
  const [, action, pending] = useActionState(async (prev: ConfirmParticipationState, formData: FormData) => {
    const next = await adminConfirmParticipation(prev, formData);
    setResult(next);
    return next;
  }, initial);
  const [deleteYear, setDeleteYear] = useState<number | null>(null);
  const [, deleteAction, deletePending] = useActionState(
    async (prev: ConfirmParticipationState, formData: FormData) => {
      const next = await adminDeleteParticipation(prev, formData);
      setDeleteYear(null);
      setResult(next);
      return next;
    },
    initial,
  );
  const deleteFormRef = useRef<HTMLFormElement>(null);

  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700 }}>การเข้าร่วมรายปีงบประมาณ</h2>
      <p style={{ marginTop: 8 }}>
        {confirmedYears.length > 0 ? (
          confirmedYears.map((y) => (
            <span key={y} className="pill done" style={{ marginRight: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>
              ปีงบ {y}
              <button
                type="button"
                aria-label={`ลบการเข้าร่วมปีงบ ${y}`}
                title={`ลบการเข้าร่วมปีงบ ${y}`}
                onClick={() => setDeleteYear(y)}
                style={{ display: "inline-flex", padding: 0, border: 0, background: "none", color: "inherit", cursor: "pointer" }}
              >
                <X size={13} />
              </button>
            </span>
          ))
        ) : (
          <span className="footnote">ยังไม่มีปีงบที่ยืนยันเข้าร่วม — เจ้าหน้าที่สร้างชั้นเรียนได้เลยโดยระบุปีงบในหน้าสร้างชั้นเรียน (ระบบจะบันทึกการเข้าร่วมให้อัตโนมัติ){canRecord ? " หรือจะบันทึกไว้ล่วงหน้าที่นี่ก็ได้" : ""}</span>
        )}
      </p>
      {canRecord && (
      <form action={action} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 12 }}>
        <input type="hidden" name="unit_id" value={unitId} />
        <label>
          <span className="field-label">บันทึกการเข้าร่วม (ปีงบ พ.ศ.)</span>
          <input
            name="fiscal_year"
            type="number"
            required
            min={2500}
            max={2700}
            defaultValue={defaultFiscalYear}
            className="field"
            style={{ maxWidth: 140 }}
          />
        </label>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "กำลังบันทึก..." : "บันทึกการเข้าร่วม"}
        </button>
      </form>
      )}

      <form ref={deleteFormRef} action={deleteAction}>
        <input type="hidden" name="unit_id" value={unitId} />
        <input type="hidden" name="fiscal_year" value={deleteYear ?? ""} />
      </form>
      <ConfirmDialog
        open={deleteYear !== null}
        danger
        pending={deletePending}
        title="ลบการเข้าร่วมรายปีงบประมาณ"
        confirmLabel="ลบรายการนี้"
        message={<>จะลบการเข้าร่วม <strong>ปีงบ {deleteYear}</strong> ของหน่วยนี้ หน่วยจะไม่ถูกนับเป็นหน่วยที่เข้าร่วมในปีงบนั้น ทำได้เฉพาะปีงบที่ยังไม่มีชั้นเรียน</>}
        onCancel={() => setDeleteYear(null)}
        onConfirm={() => deleteFormRef.current?.requestSubmit()}
      />
      {result.error && <p className="notice error" style={{ marginTop: 10 }}>{result.error}</p>}
      {result.success && <p className="pill done" style={{ marginTop: 10 }}>{result.success}</p>}
    </section>
  );
}
