import { createClient } from "@/lib/supabase/server";

export type UserRole = "web_master" | "central_staff" | "unit_coordinator" | "executive";

export type Profile = {
  id: string;
  role: UserRole;
  unit_scope: string | null;
  display_name: string | null;
  must_change_password: boolean;
  avatar_path: string | null;
};

export async function getCurrentProfile(): Promise<{
  email: string | null;
  profile: Profile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { email: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, unit_scope, display_name, must_change_password, avatar_path")
    .eq("id", user.id)
    .single();

  return { email: user.email ?? null, profile: (profile as Profile) ?? null };
}
