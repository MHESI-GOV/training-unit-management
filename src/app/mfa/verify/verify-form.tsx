"use client";

import { useActionState } from "react";
import { verifyMfaChallenge, type VerifyState } from "./actions";

const initialState: VerifyState = {};

export function VerifyForm({ factorId }: { factorId: string }) {
  const boundAction = verifyMfaChallenge.bind(null, factorId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8, maxWidth: 240 }}>
      <label>
        รหัส 6 หลักจากแอป Authenticator
        <input name="code" inputMode="numeric" pattern="\d{6}" required style={{ width: "100%" }} />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "กำลังยืนยัน..." : "ยืนยัน"}
      </button>
      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
    </form>
  );
}
