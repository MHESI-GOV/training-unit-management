"use client";

import { useActionState, useState } from "react";
import { startEnrollment, confirmEnrollment, type EnrollmentData, type ConfirmState } from "./actions";

const initialState: ConfirmState = {};

export function EnrollClient() {
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  if (!enrollment) {
    return (
      <div>
        <button
          type="button"
          disabled={starting}
          onClick={async () => {
            setStarting(true);
            setStartError(null);
            try {
              setEnrollment(await startEnrollment());
            } catch (e) {
              setStartError(e instanceof Error ? e.message : "เริ่มตั้งค่าไม่สำเร็จ");
            } finally {
              setStarting(false);
            }
          }}
        >
          {starting ? "กำลังเริ่มตั้งค่า..." : "เริ่มตั้งค่า MFA"}
        </button>
        {startError && <p style={{ color: "crimson" }}>{startError}</p>}
      </div>
    );
  }

  return <ConfirmStep enrollment={enrollment} />;
}

function ConfirmStep({ enrollment }: { enrollment: EnrollmentData }) {
  const boundAction = confirmEnrollment.bind(null, enrollment.factorId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p>สแกน QR ด้วยแอป Authenticator (เช่น Google Authenticator, Authy)</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enrollment.qrCode} alt="MFA QR code" width={200} height={200} />
      <p style={{ fontSize: 13, color: "#666" }}>
        หรือกรอกรหัสด้วยตนเอง: <code>{enrollment.secret}</code>
      </p>
      <form action={formAction} style={{ display: "grid", gap: 8, maxWidth: 240 }}>
        <label>
          รหัส 6 หลักจากแอป
          <input name="code" inputMode="numeric" pattern="\d{6}" required style={{ width: "100%" }} />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "กำลังยืนยัน..." : "ยืนยัน"}
        </button>
        {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
      </form>
    </div>
  );
}
