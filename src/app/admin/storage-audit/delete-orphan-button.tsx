"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteOrphanFile } from "./actions";

export function DeleteOrphanButton({
  reportId,
  storageKey,
}: {
  reportId: string;
  storageKey: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <span className="pill done">ลบแล้ว</span>;

  return (
    <>
      <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 13 }} onClick={() => setOpen(true)}>
        ลบไฟล์นี้
      </button>
      <ConfirmDialog
        open={open}
        danger
        pending={pending}
        title="ยืนยันการลบไฟล์"
        confirmLabel="ยืนยันลบ"
        message={
          <>
            ลบไฟล์นี้อย่างถาวร?
            <br />
            <span className="footnote" style={{ wordBreak: "break-all" }}>{storageKey}</span>
          </>
        }
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setPending(true);
          try {
            await deleteOrphanFile(reportId, storageKey);
            setDone(true);
            setOpen(false);
          } finally {
            setPending(false);
          }
        }}
      />
    </>
  );
}
