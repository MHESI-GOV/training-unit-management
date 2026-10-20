"use client";

import { useState } from "react";

export function ExportLearners({ unitId }: { unitId: string }) {
  const [armed, setArmed] = useState(false);

  const href = unitId ? `/api/export/learners?unit_id=${unitId}` : "/api/export/learners";

  return (
    <div style={{ marginTop: 24 }}>
      {!armed ? (
        <button type="button" onClick={() => setArmed(true)}>
          ส่งออกรายชื่อผู้เรียน (CSV){unitId ? "" : " — ทุกหน่วย"}
        </button>
      ) : (
        <div>
          <p style={{ color: "darkorange" }}>
            ไฟล์นี้มีข้อมูลระบุตัวตนของผู้เรียน (รวมเลขบัตรประชาชน) ยืนยันอีกครั้งก่อนดาวน์โหลด
          </p>
          <a href={href} onClick={() => setArmed(false)}>
            <button type="button">ยืนยันและดาวน์โหลด</button>
          </a>{" "}
          <button type="button" onClick={() => setArmed(false)}>
            ยกเลิก
          </button>
        </div>
      )}
    </div>
  );
}
