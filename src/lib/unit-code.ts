import type { SupabaseClient } from "@supabase/supabase-js";
import { unitCode, type UnitCodeParts } from "@/lib/id-codes";

// Fetch the pieces needed to compose a unit's code (region + unit_seq from training_units,
// province_name from its profile) and return both the parts and the ready-made code string.
// Teacher/student/class codes are then composed from `code` + the child's own serial/batch.
export async function fetchUnitCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  unitId: string,
): Promise<UnitCodeParts & { code: string | null }> {
  const { data: unit } = await supabase
    .from("training_units")
    .select("region, unit_seq")
    .eq("unit_id", unitId)
    .maybeSingle();
  const { data: profile } = await supabase
    .from("training_unit_profiles")
    .select("province_name")
    .eq("unit_id", unitId)
    .maybeSingle();

  const parts: UnitCodeParts = {
    region: unit?.region ?? null,
    provinceName: (profile as { province_name?: string | null } | null)?.province_name ?? null,
    unitSeq: unit?.unit_seq ?? null,
  };
  return { ...parts, code: unitCode(parts) };
}
