"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function ExportLearners({ unitId }: { unitId: string }) {
  const [open, setOpen] = useState(false);
  const href = unitId ? `/api/export/learners?unit_id=${unitId}` : "/api/export/learners";

  return (
    <>
      <button type="button" className="btn secondary" onClick={() => setOpen(true)}>
        ส่งออกรายชื่อผู้เรียน (Excel){unitId ? "" : " — ทุกหน่วย"}
      </button>
      <ConfirmDialog
        open={open}
        danger
        title="ยืนยันการส่งออกข้อมูลผู้เรียน"
        confirmLabel="ยืนยันและดาวน์โหลด"
        message="ไฟล์นี้มีข้อมูลระบุตัวตนของผู้เรียน (รวมเลขบัตรประชาชน) — ยืนยันการดาวน์โหลดเป็นไฟล์ Excel?"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          // Navigating to an attachment response triggers the download without leaving the page.
          window.location.href = href;
          setOpen(false);
        }}
      />
    </>
  );
}
