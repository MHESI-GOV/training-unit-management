"use client";

import { useState } from "react";
import { revealNationalId } from "./actions";

export function RevealIdButton({ unitId, learnerId }: { unitId: string; learnerId: string }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (revealed) {
    return <span className="pill study">เลขบัตร: {revealed}</span>;
  }

  return (
    <button
      type="button"
      className="btn secondary"
      style={{ padding: "4px 10px", fontSize: 13 }}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          setRevealed(await revealNationalId(unitId, learnerId));
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "กำลังเปิดเผย..." : "เผยเลขบัตรเต็ม"}
    </button>
  );
}
