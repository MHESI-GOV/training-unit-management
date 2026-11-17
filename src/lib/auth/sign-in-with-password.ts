import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by the full-page /login server action and the login popup (client side).
//
// Users paste the temporary password from the Generate User / reset email, and mail clients often
// carry a trailing space or newline along with it, which Supabase rejects as
// "Invalid login credentials". The email is always trimmed and lowercased. The password is tried
// exactly as typed first, so a password that really starts or ends with a space still works, and
// only if that fails is it retried once without the surrounding whitespace.
export async function signInWithPassword(supabase: SupabaseClient, rawEmail: string, rawPassword: string) {
  const email = rawEmail.trim().toLowerCase();
  const first = await supabase.auth.signInWithPassword({ email, password: rawPassword });
  if (!first.error) return first;

  const trimmed = rawPassword.trim();
  if (trimmed && trimmed !== rawPassword) {
    const retry = await supabase.auth.signInWithPassword({ email, password: trimmed });
    if (!retry.error) return retry;
  }
  return first;
}
