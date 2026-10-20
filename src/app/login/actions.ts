"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export type SignInMfaState = {
  error?: string;
  step?: "mfa-enroll" | "mfa-verify";
  factorId?: string;
};

// Used only by the login popup (@modal/(.)login) so the Web Master MFA gate can happen as a
// step *within the same floating modal* instead of relying on middleware's own redirect() --
// a server-triggered redirect breaks Next.js's intercepting-route popup (confirmed by testing:
// right after a plain signIn() + redirect("/"), middleware bounces a Web Master with no/
// unverified MFA to a full-page /mfa/enroll or /mfa/verify, not the popup version). The
// original signIn() above is untouched and still used by the full-page /login for a direct
// visit, where there's no modal to stay inside anyway.
export async function signInCheckMfa(
  _prev: SignInMfaState,
  formData: FormData,
): Promise<SignInMfaState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: error?.message ?? "เข้าสู่ระบบไม่สำเร็จ" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role === "web_master") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.[0];
    if (!factor) {
      return { step: "mfa-enroll" };
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel !== aal.nextLevel) {
      return { step: "mfa-verify", factorId: factor.id };
    }
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
