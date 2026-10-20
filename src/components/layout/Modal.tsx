"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Generic floating-popup wrapper used by intercepted routes (e.g. @modal/(.)login) -- the
// page underneath stays mounted and visible behind a dimmed backdrop, rather than navigating
// away to a full page. Closing (backdrop click, Escape, or the caller's own cancel button)
// goes back to wherever the user was, via router.back() so the URL reverts too.
export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  function close() {
    router.back();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(23, 44, 72, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 100,
      }}
    >
      {children}
    </div>
  );
}
