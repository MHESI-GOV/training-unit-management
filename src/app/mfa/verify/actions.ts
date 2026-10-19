"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type VerifyState = { error?: string };

export async function verifyMfaChallenge(
  factorId: string,
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
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

  redirect("/");
}
