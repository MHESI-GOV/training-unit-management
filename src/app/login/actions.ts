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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// "Switch account": sign out of the current session and go straight to the login screen so
// another account can sign in. The app uses a single Supabase session cookie, so this is a
// clean sign-out-then-sign-in rather than simultaneous multi-account sessions.
export async function signOutToLogin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
