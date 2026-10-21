import { createClient } from "@/lib/supabase/server";

// Short-lived signed URL for the current user's own avatar. Storage RLS (avatars_select_own)
// only lets a user sign objects under their own "<uid>/" folder, so this is safe to call with
// the caller's session for their own avatar_path.
export async function getAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
