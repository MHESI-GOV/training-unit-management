"use client";

import { useState } from "react";

export function ExportLearners({ unitId }: { unitId: string }) {
  const [armed, setArmed] = useState(false);

  const href = unitId ? `/api/export/learners?unit_id=${unitId}` : "/api/export/learners";

  if (!armed) {
    return (
      <button type="button" className="btn secondary" onClick={() => setArmed(true)}>
        ส่งออกรายชื่อผู้เรียน (CSV){unitId ? "" : " — ทุกหน่วย"}
      </button>
    );
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ color: "var(--danger)", fontSize: 14 }}>
        ไฟล์นี้มีข้อมูลระบุตัวตนของผู้เรียน (รวมเลขบัตรประชาชน) ยืนยันอีกครั้งก่อนดาวน์โหลด
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <a href={href} onClick={() => setArmed(false)} className="btn primary">
          ยืนยันและดาวน์โหลด
        </a>
        <button type="button" className="btn secondary" onClick={() => setArmed(false)}>
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
