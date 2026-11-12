import { createClient } from "@/lib/supabase/server";
import { UnitDashboard } from "@/components/dashboard/UnitDashboard";

export default async function UnitSheetDashboard({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const supabase = await createClient();
  return <UnitDashboard supabase={supabase} unitId={unitId} />;
}
