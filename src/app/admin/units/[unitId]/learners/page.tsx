import { LearnersTable } from "@/app/unit/learners/learners-table";
import { loadUnitLearners } from "@/app/unit/learners/load-learners";

// Learners of a specific unit, inside the Web Master / Central Staff unit data-sheet
// (/admin/units/[unitId]). Reuses the same table + loader as the Unit Coordinator's own
// /unit/learners page; the surrounding AppShell + tab bar come from the sheet layout.
export default async function UnitSheetLearners({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const data = await loadUnitLearners(unitId);

  return (
    <LearnersTable
      unitId={unitId}
      isStaff
      learners={data.rows}
      classes={data.classOptions}
      standards={data.standardOptions}
      fiscalYears={data.fiscalYearOptions}
    />
  );
}
