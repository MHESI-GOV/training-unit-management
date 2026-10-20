"use client";

import { useRouter } from "next/navigation";

export function CancelBackButton() {
  const router = useRouter();
  return (
    <button type="button" className="btn secondary" onClick={() => router.back()}>
      ยกเลิก
    </button>
  );
}
