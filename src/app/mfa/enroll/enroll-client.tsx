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
          className="btn primary"
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
        {startError && <p className="notice error" style={{ marginTop: 12 }}>{startError}</p>}
      </div>
    );
  }

  return <ConfirmStep enrollment={enrollment} />;
}

function ConfirmStep({ enrollment }: { enrollment: EnrollmentData }) {
  const boundAction = confirmEnrollment.bind(null, enrollment.factorId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ fontSize: 14 }}>สแกน QR ด้วยแอป Authenticator (เช่น Google Authenticator, Authy)</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enrollment.qrCode} alt="MFA QR code" width={200} height={200} style={{ borderRadius: 10 }} />
      <p className="footnote">
        หรือกรอกรหัสด้วยตนเอง: <code>{enrollment.secret}</code>
      </p>
      <form action={formAction} style={{ display: "grid", gap: 10 }}>
        <label>
          <span className="field-label">รหัส 6 หลักจากแอป</span>
          <input name="code" inputMode="numeric" pattern="\d{6}" required className="field" />
        </label>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "กำลังยืนยัน..." : "ยืนยัน"}
        </button>
        {state.error && <p className="notice error">{state.error}</p>}
      </form>
    </div>
  );
}
