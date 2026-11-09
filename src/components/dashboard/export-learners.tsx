"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// The one "ส่งออกรายชื่อผู้เรียน (Excel)" button, used on the dashboard, the all-learners page and a
// unit's learner page. Every place gets the same file from POST /api/export/learners; the server
// decides by role what goes in it (staff: full national ID; unit coordinator: own unit, ID masked).
//
//   fiscalYear  "all" / "" = every year. readYearFromUrl: on the dashboard the year dropdown rewrites
//               ?fy= in place without a reload, so a `fy` in the current URL wins over the prop.
//   classId     limit rows to one class.
//   learnerIds  the rows the page is currently filtered to (omit = everyone in scope).
export function ExportLearners({
  unitId,
  fiscalYear = "",
  readYearFromUrl = false,
  classId = "",
  learnerIds,
  fullNationalId,
  disabled = false,
}: {
  unitId: string;
  fiscalYear?: string;
  readYearFromUrl?: boolean;
  classId?: string;
  learnerIds?: string[];
  fullNationalId: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function currentYear(): string {
    const fromUrl = readYearFromUrl ? new URLSearchParams(window.location.search).get("fy") : null;
    const y = fromUrl ?? fiscalYear;
    return y && y !== "all" ? y : "";
  }

  async function download() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/export/learners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: unitId || undefined,
          fy: year || undefined,
          class_id: classId || undefined,
          learner_ids: learnerIds,
        }),
      });
      if (!res.ok) throw new Error(res.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ส่งออกข้อมูลผู้เรียน" : `ส่งออกไม่สำเร็จ (${res.status})`);
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
      const plain = /filename="([^"]+)"/i.exec(disposition);
      const name = star ? decodeURIComponent(star[1]) : plain?.[1] ?? "learners.xlsx";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ส่งออกไม่สำเร็จ");
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  const scope = `${year ? `ปีงบประมาณ ${year}` : "ทุกปีงบประมาณ"}${learnerIds ? ` ตามตัวกรอง (${learnerIds.length} คน)` : ""}`;

  return (
    <>
      <button
        type="button"
        className="btn secondary"
        disabled={disabled || pending}
        onClick={() => {
          setYear(currentYear());
          setOpen(true);
        }}
      >
        {pending ? "กำลังส่งออก..." : `ส่งออกรายชื่อผู้เรียน (Excel)${unitId ? "" : " — ทุกหน่วย"}`}
      </button>
      {error && <span className="footnote" style={{ color: "var(--danger)" }}>{error}</span>}
      <ConfirmDialog
        open={open}
        danger={fullNationalId}
        pending={pending}
        title="ยืนยันการส่งออกข้อมูลผู้เรียน"
        confirmLabel="ยืนยันและดาวน์โหลด"
        message={
          fullNationalId
            ? `ส่งออกผู้เรียน${scope} — ไฟล์นี้มีข้อมูลระบุตัวตนของผู้เรียน (รวมเลขบัตรประชาชน) ยืนยันการดาวน์โหลดเป็นไฟล์ Excel?`
            : `ส่งออกผู้เรียน${scope} เป็นไฟล์ Excel — เลขบัตรประชาชนในไฟล์จะแสดงเฉพาะ 4 หลักท้าย`
        }
        onCancel={() => setOpen(false)}
        onConfirm={download}
      />
    </>
  );
}
