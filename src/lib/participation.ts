import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type PendingParticipation = {
  round_id: string;
  fiscal_year: number;
  deadline: string | null;
  notice_message: string | null;
};

// Returns the open round this unit has NOT yet responded to (status still 'invited'), or null.
// Used by AppShell to force the participation-confirmation popup before any other function once
// Web Master opens a round. Cleared the moment the coordinator confirms or declines.
export async function getPendingParticipation(
  supabase: SupabaseClient<Database>,
  unitId: string,
): Promise<PendingParticipation | null> {
  const { data } = await supabase
    .from("unit_participation")
    .select("round_id, fiscal_year, participation_rounds!inner(status, deadline, notice_message)")
    .eq("unit_id", unitId)
    .eq("status", "invited")
    .eq("participation_rounds.status", "open")
    .order("fiscal_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const round = data.participation_rounds;
  return {
    round_id: data.round_id,
    fiscal_year: data.fiscal_year,
    deadline: round?.deadline ?? null,
    notice_message: round?.notice_message ?? null,
  };
}
