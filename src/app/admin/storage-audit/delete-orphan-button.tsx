"use client";

import { useState } from "react";
import { deleteOrphanFile } from "./actions";

export function DeleteOrphanButton({
  reportId,
  storageKey,
}: {
  reportId: string;
  storageKey: string;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <span className="pill done">ลบแล้ว</span>;

  if (!armed) {
    return (
      <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 13 }} onClick={() => setArmed(true)}>
        ลบไฟล์นี้
      </button>
    );
  }

  return (
    <>
      <span className="pill pending">ยืนยันลบไฟล์นี้ถาวร?</span>
      <button
        type="button"
        className="btn danger"
        style={{ padding: "4px 10px", fontSize: 13 }}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await deleteOrphanFile(reportId, storageKey);
            setDone(true);
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "กำลังลบ..." : "ยืนยันลบ"}
      </button>
      <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 13 }} onClick={() => setArmed(false)}>
        ยกเลิก
      </button>
    </>
  );
}
