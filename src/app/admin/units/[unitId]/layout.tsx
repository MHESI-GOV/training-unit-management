import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffProfile } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { SheetTabs } from "./sheet-tabs";

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

  return (
    <AppShell profile={profile} active="units" eyebrow="ข้อมูลหน่วยฝึกอบรม" title={unit.name}>
      <p style={{ marginBottom: 14 }}>
        <Link href="/admin/units">← กลับไปหน่วยฝึกอบรมทั้งหมด</Link>
      </p>
      <SheetTabs unitId={unitId} />
      {children}
    </AppShell>
  );
}
