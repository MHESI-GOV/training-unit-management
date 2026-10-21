import Link from "next/link";
import { redirect } from "next/navigation";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { AppShell } from "@/components/layout/AppShell";
import { UnitProfilePanel } from "./unit-profile-panel";

export default async function UnitProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  // A Unit Coordinator's own unit profile now lives on /account (one account = one unit), so the
  // standalone page is for Web Master / Central Staff viewing other units only.
  if (!isStaff) redirect("/account");

  return (
    <AppShell profile={profile} active="units" eyebrow="" title="โปรไฟล์หน่วยฝึก">
      <p style={{ marginBottom: 14 }}>
        <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
      </p>
      <UnitProfilePanel unitId={unitId} />
    </AppShell>
  );
}
