"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";

// The calling Unit Coordinator confirms or declines their own unit's participation in an open
// round. All the real checks (role, unit ownership, round open, invite exists) live in the
// respond_participation() SECURITY DEFINER function; this just forwards the choice.
export async function respondParticipation(formData: FormData): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== "unit_coordinator") return;

  const roundId = String(formData.get("round_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!roundId || (status !== "confirmed" && status !== "declined")) return;

  const note = String(formData.get("note") ?? "").trim() || null;

  const supabase = await createClient();
  await supabase.rpc("respond_participation", {
    p_round_id: roundId,
    p_status: status,
    p_note: note ?? undefined,
  });

  revalidatePath("/unit/participation");
  revalidatePath("/");
}
