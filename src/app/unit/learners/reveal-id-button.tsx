"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { revealNationalId } from "./actions";

// The one way a page shows a national ID: an eye toggle. Nothing (not even the last 4 digits) is
// shown until it's clicked; the first click fetches the full number (audit-logged server side),
// later clicks just hide / show it again.
export function RevealIdButton({ unitId, learnerId }: { unitId: string; learnerId: string }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [pending, setPending] = useState(false);

  async function reveal() {
    setPending(true);
    try {
      setRevealed(await revealNationalId(unitId, learnerId));
    } finally {
      setPending(false);
    }
  }

  const showing = revealed !== null && !hidden;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {showing && <span style={{ fontVariantNumeric: "tabular-nums" }}>{revealed}</span>}
      <button
        type="button"
        className="icon-btn"
        title={showing ? "ซ่อนเลขบัตรประชาชน" : "ดูเลขบัตรประชาชน"}
        aria-label={showing ? "ซ่อนเลขบัตรประชาชน" : "ดูเลขบัตรประชาชน"}
        aria-pressed={showing}
        disabled={pending}
        onClick={() => {
          if (revealed === null) void reveal();
          else setHidden(showing);
        }}
      >
        {showing ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span>
  );
}
