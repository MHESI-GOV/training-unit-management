"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/layout/AuthCard";
import { CancelBackButton } from "@/components/layout/CancelBackButton";
import { PasswordField } from "@/components/ui/PasswordField";

// The whole login -> (Web Master only) MFA sequence runs ENTIRELY client-side against Supabase,
// inside this one popup, and only does a single hard navigation to "/" at the very end.
//
// This is deliberate and load-bearing: the popup is an intercepting route floating over the
// home page ("/" stays mounted as its background). A server action invoked from here would make
// Next.js revalidate the whole current route tree -- including that "/" background -- and the
// "/" revalidation runs middleware, which force-redirects a logged-in Web Master without MFA to
// a full-page /mfa/enroll, yanking the user out of the popup mid-flow (this was the original bug,
// confirmed from the dev server middleware log). Pure client-side Supabase calls trigger no such
// revalidation, so the MFA step can live right here in the popup. window.location (a hard nav,
// not router.push) is used at the end because a soft push to a sibling route does not reset this
// parallel @modal slot to its default, so the popup would otherwise stay stuck on top of home.
//
// Only Web Master requires MFA (mirrors middleware's own rule); every other role goes straight
// to "/". The full-page /login + /mfa/* routes still exist unchanged for direct visits.

type Step = "login" | "mfa-enroll" | "mfa-verify";
type EnrollData = { factorId: string; qr: string; secret: string };

export function LoginModalFlow() {
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState<Step>("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<EnrollData | null>(null);
  const [verifyFactorId, setVerifyFactorId] = useState<string | null>(null);

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      setError(signInError?.message ?? "เข้าสู่ระบบไม่สำเร็จ");
      setPending(false);
      return;
    }
    setUserId(data.user.id);

    // Only Web Master is gated by MFA; everyone else leaves immediately.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.role !== "web_master") {
      window.location.assign("/");
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp?.[0]; // `.totp` lists verified factors only
    if (verified) {
      setVerifyFactorId(verified.id);
      setStep("mfa-verify");
      setPending(false);
      return;
    }

    // No verified factor yet -> enroll. Clear any abandoned unverified factor first; Supabase
    // rejects enrolling a second TOTP factor while an unverified one lingers (those only appear
    // in `.all`, not `.totp`).
    for (const f of factors?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data: enrolled, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (enrollErr || !enrolled) {
      setError(enrollErr?.message ?? "เริ่มตั้งค่า MFA ไม่สำเร็จ");
      setPending(false);
      return;
    }
    setEnroll({ factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
    setStep("mfa-enroll");
    setPending(false);
  }

  async function submitCode(factorId: string, code: string, isEnroll: boolean) {
    setError(null);
    setPending(true);

    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr || !challenge) {
      setError(`เริ่มการตรวจสอบไม่สำเร็จ: ${chErr?.message ?? ""}`);
      setPending(false);
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (vErr) {
      setError("รหัสไม่ถูกต้อง กรุณาลองใหม่");
      setPending(false);
      return;
    }

    // Best-effort bookkeeping flag (not used for enforcement -- middleware checks real factors).
    if (isEnroll && userId) {
      await supabase.from("profiles").update({ mfa_enabled: true }).eq("id", userId);
    }
    window.location.assign("/");
  }

  if (step === "mfa-enroll" && enroll) {
    return (
      <AuthCard title="ตั้งค่า MFA" subtitle="บัญชี Web Master ต้องเปิดใช้งาน MFA ก่อนจึงจะใช้งานระบบต่อได้">
        {error && <p className="notice error">{error}</p>}
        <div style={{ display: "grid", gap: 14 }}>
          <p style={{ fontSize: 14 }}>สแกน QR ด้วยแอป Authenticator (เช่น Google Authenticator, Authy)</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="MFA QR code" width={200} height={200} style={{ borderRadius: 10, alignSelf: "center" }} />
          <p className="footnote">
            หรือกรอกรหัสด้วยตนเอง: <code>{enroll.secret}</code>
          </p>
          <CodeForm
            label="รหัส 6 หลักจากแอป"
            pending={pending}
            onSubmit={(code) => submitCode(enroll.factorId, code, true)}
          />
        </div>
      </AuthCard>
    );
  }

  if (step === "mfa-verify" && verifyFactorId) {
    return (
      <AuthCard title="ยืนยันตัวตนสองชั้น" subtitle="กรอกรหัสจากแอป Authenticator เพื่อเข้าสู่ระบบ">
        {error && <p className="notice error">{error}</p>}
        <CodeForm
          label="รหัส 6 หลักจากแอป Authenticator"
          pending={pending}
          onSubmit={(code) => submitCode(verifyFactorId, code, false)}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="เข้าสู่ระบบ" subtitle="ระบบจัดการหน่วยฝึกอบรม">
      {error && <p className="notice error">เข้าสู่ระบบไม่สำเร็จ: {error}</p>}
      <form onSubmit={onLogin} style={{ display: "grid", gap: 14 }}>
        <label>
          <span className="field-label">อีเมล</span>
          <input name="email" type="email" required className="field" />
        </label>
        <label>
          <span className="field-label">รหัสผ่าน</span>
          <PasswordField name="password" required autoComplete="current-password" />
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={pending}>
            {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          <CancelBackButton />
        </div>
      </form>
    </AuthCard>
  );
}

function CodeForm({
  label,
  pending,
  onSubmit,
}: {
  label: string;
  pending: boolean;
  onSubmit: (code: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const code = String(new FormData(e.currentTarget).get("code") ?? "").trim();
        onSubmit(code);
      }}
      style={{ display: "grid", gap: 10 }}
    >
      <label>
        <span className="field-label">{label}</span>
        <input name="code" inputMode="numeric" pattern="\d{6}" required className="field" autoComplete="one-time-code" />
      </label>
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังยืนยัน..." : "ยืนยัน"}
      </button>
    </form>
  );
}
