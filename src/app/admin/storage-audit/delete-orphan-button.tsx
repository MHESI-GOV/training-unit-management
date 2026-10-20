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

  if (done) return <span style={{ color: "green" }}>ลบแล้ว</span>;

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)}>
        ลบไฟล์นี้
      </button>
    );
  }

  return (
    <>
      <span style={{ color: "darkorange" }}>ยืนยันลบไฟล์นี้ถาวร?</span>
      <button
        type="button"
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
      <button type="button" onClick={() => setArmed(false)}>
        ยกเลิก
      </button>
    </>
  );
}
