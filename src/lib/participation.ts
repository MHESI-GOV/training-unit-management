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

export type ConfirmedRound = { round_id: string; fiscal_year: number };

// Current Thai fiscal year (BE): the year runs Oct–Sep, so Oct–Dec rolls into the next BE year.
export function currentThaiFiscalYear(d: Date = new Date()): number {
  return d.getFullYear() + 543 + (d.getMonth() + 1 >= 10 ? 1 : 0);
}

// Staff-only "open the gate" helper: guarantee this unit has a CONFIRMED participation row for the
// given fiscal year so a class can bind to it — WITHOUT the coordinator having to confirm an open
// round first. Mirrors adminConfirmParticipation: reuse the round for that FY if one exists, else
// create a CLOSED one (so it never pops the confirm prompt for other coordinators), then mark THIS
// unit confirmed. Must be called with a service-role (admin) client — participation tables have no
// INSERT policy for a normal session. Returns the target round, or null on failure.
export async function ensureUnitParticipation(
  admin: SupabaseClient<Database>,
  unitId: string,
  fiscalYear: number,
  actorId: string,
): Promise<ConfirmedRound | null> {
  const { data: existing } = await admin
    .from("participation_rounds")
    .select("round_id")
    .eq("fiscal_year", fiscalYear)
    .maybeSingle();

  let roundId = existing?.round_id;
  if (!roundId) {
    const { data: created, error } = await admin
      .from("participation_rounds")
      .insert({ fiscal_year: fiscalYear, status: "closed", opened_by: actorId })
      .select("round_id")
      .single();
    if (error || !created) return null;
    roundId = created.round_id;
  }

  const { error: upErr } = await admin.from("unit_participation").upsert(
    {
      round_id: roundId,
      unit_id: unitId,
      fiscal_year: fiscalYear,
      status: "confirmed",
      responded_by: actorId,
      responded_at: new Date().toISOString(),
    },
    { onConflict: "round_id,unit_id" },
  );
  if (upErr) return null;

  return { round_id: roundId, fiscal_year: fiscalYear };
}

// Fiscal years this unit has CONFIRMED participation in (unit_participation.status = 'confirmed'),
// newest first. Creating a class requires at least one of these; a class is bound to one of them
// (default = the latest). The round being open or closed does NOT matter — "open" was only the
// window to confirm; once confirmed, the unit can keep opening classes for that year.
export async function getUnitConfirmedRounds(
  supabase: SupabaseClient<Database>,
  unitId: string,
): Promise<ConfirmedRound[]> {
  const { data } = await supabase
    .from("unit_participation")
    .select("round_id, fiscal_year")
    .eq("unit_id", unitId)
    .eq("status", "confirmed")
    .order("fiscal_year", { ascending: false });
  return (data ?? []).map((r) => ({ round_id: r.round_id, fiscal_year: r.fiscal_year }));
}
