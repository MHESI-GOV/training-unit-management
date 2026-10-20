"use client";

import { useActionState } from "react";
import { verifyMfaChallenge, type VerifyState } from "./actions";

const initialState: VerifyState = {};

export function VerifyForm({ factorId }: { factorId: string }) {
  const boundAction = verifyMfaChallenge.bind(null, factorId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <label>
        <span className="field-label">รหัส 6 หลักจากแอป Authenticator</span>
        <input name="code" inputMode="numeric" pattern="\d{6}" required className="field" />
      </label>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังยืนยัน..." : "ยืนยัน"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}
