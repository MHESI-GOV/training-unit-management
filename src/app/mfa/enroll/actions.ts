"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";

export type EnrollmentData = { factorId: string; qrCode: string; secret: string };

export async function startEnrollment(): Promise<EnrollmentData> {
  await requireProfile();
  const supabase = await createClient();

  // Clear out any abandoned unverified factor from a previous attempt first — Supabase
  // rejects enrolling a second TOTP factor while an unverified one still exists.
  // (listFactors()'s `.totp` grouping only includes verified factors by its own type;
  // unverified ones only show up in `.all`.)
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const factor of existing?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) throw new Error(error?.message ?? "enroll failed");

  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export type ConfirmState = { error?: string };

export async function confirmEnrollment(
  factorId: string,
  _prev: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const profile = await requireProfile();
  const code = String(formData.get("code") ?? "").trim();

  const supabase = await createClient();
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr || !challenge) return { error: `เริ่มการตรวจสอบไม่สำเร็จ: ${challengeErr?.message}` };

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) return { error: "รหัสไม่ถูกต้อง กรุณาลองใหม่" };

  await supabase.from("profiles").update({ mfa_enabled: true }).eq("id", profile.id);

  redirect("/");
}
