"use client";

import { useState } from "react";
import { runOrphanCheckNow } from "./actions";

export function CheckNowButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="btn primary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await runOrphanCheckNow();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "กำลังตรวจสอบ..." : "ตรวจสอบตอนนี้"}
    </button>
  );
}
