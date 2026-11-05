"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { revealNationalId } from "./actions";

export function RevealIdButton({
  unitId,
  learnerId,
  iconOnly = false,
}: {
  unitId: string;
  learnerId: string;
  iconOnly?: boolean; // eye toggle for tight table cells: shows nothing until it's clicked
}) {
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

  if (iconOnly) {
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

  if (revealed) {
    return <span className="pill study">เลขบัตร: {revealed}</span>;
  }

  return (
    <button
      type="button"
      className="btn secondary"
      style={{ padding: "4px 10px", fontSize: 13 }}
      disabled={pending}
      onClick={reveal}
    >
      {pending ? "กำลังเปิดเผย..." : "เผยเลขบัตรเต็ม"}
    </button>
  );
}
