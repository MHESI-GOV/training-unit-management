import { createClient } from "@/lib/supabase/server";
import { OverviewSection } from "@/components/dashboard/OverviewSection";
import { resolveFiscalYear, type Overview } from "@/lib/dashboard";

export default async function UnitSheetDashboard({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const supabase = await createClient();

  const { data: yearsRaw } = await supabase.rpc("get_dashboard_fiscal_years");
  const years = (yearsRaw as number[] | null) ?? [];
  const { selected, param } = resolveFiscalYear(undefined, years);

  const { data: ovRaw, error } = await supabase.rpc("get_dashboard_overview", {
    p_unit_id: unitId,
    p_fiscal_year: param ?? undefined,
  });
  const ov = (ovRaw as Overview | null) ?? null;

  if (error) return <p style={{ color: "var(--danger)" }}>โหลดข้อมูลไม่สำเร็จ: {error.message}</p>;
  if (!ov) return <p className="footnote">ยังไม่มีข้อมูลแดชบอร์ด</p>;

  return (
    <OverviewSection key={unitId} initialOv={ov} years={years} initialSelected={selected} unitId={unitId} />
  );
}
