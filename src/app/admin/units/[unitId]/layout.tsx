import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffProfile } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUnitConfirmedRounds } from "@/lib/participation";
import { thaiFiscalYear } from "@/lib/fiscal-year";
import { AppShell } from "@/components/layout/AppShell";
import { SheetTabs } from "./sheet-tabs";
import { UnitCoordinatorPanel, type UnscopedCoordinator } from "./unit-coordinator-panel";
import { UnitParticipationPanel } from "./unit-participation-panel";

export default async function UnitSheetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ unitId: string }>;
}) {
  const profile = await requireStaffProfile();
  const { unitId } = await params;

  const supabase = await createClient();
  const { data: unit } = await supabase
    .from("training_units")
    .select("name")
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!unit) notFound();

  // Coordinator + participation management is Web-Master-only (account + round writes are a WM
  // carve-out). Central Staff can still fill all the unit's data via the tabs below.
  const isWebMaster = profile.role === "web_master";
  let coordinatorName: string | null = null;
  let coordinatorEmail: string | null = null;
  let unscoped: UnscopedCoordinator[] = [];
  let confirmedYears: number[] = [];

  if (isWebMaster) {
    const admin = createAdminClient();
    const [{ data: coordProfiles }, confirmed] = await Promise.all([
      admin.from("profiles").select("id, display_name, unit_scope").eq("role", "unit_coordinator"),
      getUnitConfirmedRounds(supabase, unitId),
    ]);
    confirmedYears = confirmed.map((r) => r.fiscal_year);

    const current = (coordProfiles ?? []).find((p) => p.unit_scope === unitId);
    const unassigned = (coordProfiles ?? []).filter((p) => !p.unit_scope);
    if (current || unassigned.length) {
      const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const emailById = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? ""]));
      if (current) {
        coordinatorName = current.display_name ?? "(ไม่มีชื่อ)";
        coordinatorEmail = emailById.get(current.id) ?? null;
      }
      unscoped = unassigned.map((p) => ({
        id: p.id,
        label: `${p.display_name ?? "(ไม่มีชื่อ)"}${emailById.get(p.id) ? ` · ${emailById.get(p.id)}` : ""}`,
      }));
    }
  }

  return (
    <AppShell profile={profile} active="units" eyebrow="ข้อมูลหน่วยฝึกอบรม" title={unit.name}>
      <p style={{ marginBottom: 14 }}>
        <Link href="/admin/units">← กลับไปหน่วยฝึกอบรมทั้งหมด</Link>
      </p>
      {isWebMaster && (
        <>
          <UnitCoordinatorPanel
            unitId={unitId}
            coordinatorName={coordinatorName}
            coordinatorEmail={coordinatorEmail}
            unscoped={unscoped}
          />
          <UnitParticipationPanel
            unitId={unitId}
            confirmedYears={confirmedYears}
            defaultFiscalYear={thaiFiscalYear()}
          />
        </>
      )}
      <SheetTabs unitId={unitId} />
      {children}
    </AppShell>
  );
}
