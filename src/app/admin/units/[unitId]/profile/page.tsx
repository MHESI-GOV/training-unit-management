import { UnitProfilePanel } from "@/app/unit/profile/unit-profile-panel";

export default async function UnitSheetProfile({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  return <UnitProfilePanel unitId={unitId} />;
}
