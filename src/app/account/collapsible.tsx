"use client";

import { useState } from "react";

// A card section that stays collapsed until the user presses the activate button — guards against
// accidentally editing sensitive fields (password / login email).
export function Collapsible({
  title,
  openLabel,
  children,
}: {
  title: string;
  openLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2>
        <button type="button" className="btn secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "ยกเลิก" : openLabel}
        </button>
      </div>
      {open && <div style={{ marginTop: 16 }}>{children}</div>}
    </section>
  );
}
