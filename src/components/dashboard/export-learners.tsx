"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// fiscalYear: the year to export ("all" or "" = every year). On the dashboard the year dropdown
// rewrites ?fy= in place without a reload, so a `fy` in the current URL wins over the prop.
export function ExportLearners({
  unitId,
  fiscalYear = "",
  readYearFromUrl = false,
}: {
  unitId: string;
  fiscalYear?: string;
  readYearFromUrl?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState("");

  function currentYear(): string {
    const fromUrl = readYearFromUrl ? new URLSearchParams(window.location.search).get("fy") : null;
    const y = fromUrl ?? fiscalYear;
    return y && y !== "all" ? y : "";
  }

  function href(y: string): string {
    const params = new URLSearchParams();
    if (unitId) params.set("unit_id", unitId);
    if (y) params.set("fy", y);
    const qs = params.toString();
    return qs ? `/api/export/learners?${qs}` : "/api/export/learners";
  }

  return (
    <>
      <button
        type="button"
        className="btn secondary"
        onClick={() => {
          setYear(currentYear());
          setOpen(true);
        }}
      >
        ส่งออกรายชื่อผู้เรียน (Excel){unitId ? "" : " — ทุกหน่วย"}
      </button>
      <ConfirmDialog
        open={open}
        danger
        title="ยืนยันการส่งออกข้อมูลผู้เรียน"
        confirmLabel="ยืนยันและดาวน์โหลด"
        message={`ส่งออกผู้เรียน${year ? `ปีงบประมาณ ${year}` : "ทุกปีงบประมาณ"} — ไฟล์นี้มีข้อมูลระบุตัวตนของผู้เรียน (รวมเลขบัตรประชาชน) ยืนยันการดาวน์โหลดเป็นไฟล์ Excel?`}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          // Navigating to an attachment response triggers the download without leaving the page.
          window.location.href = href(year);
          setOpen(false);
        }}
      />
    </>
  );
}
