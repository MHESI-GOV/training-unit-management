import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { LearnersTable } from "./learners-table";
import { loadUnitLearners } from "./load-learners";

export default async function UnitLearnersPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  const supabase = await createClient();
  const [data, { data: unit }] = await Promise.all([
    loadUnitLearners(unitId),
    supabase.from("training_units").select("name").eq("unit_id", unitId).maybeSingle(),
  ]);

  return (
    <AppShell
      profile={profile}
      active="learners"
      eyebrow="ข้อมูลผู้เรียน"
      title="ค้นหาและรายงานผู้เรียน"
      unitName={unit?.name ?? null}
    >
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <p className="footnote" style={{ marginBottom: 18 }}>
        หน้านี้ใช้ค้นหาและออกรายงานผู้เรียน (สถานะการเรียน ผลการเรียน มาตรฐานที่ได้รับ อายุ) ·
        การเพิ่มผู้เรียนและบันทึกผลทำในแต่ละชั้นเรียนที่เมนู{" "}
        <Link href={`/unit/classes${isStaff ? `?unit_id=${unitId}` : ""}`}>จัดการชั้นเรียน</Link>
      </p>

      <LearnersTable
        unitId={unitId}
        isStaff={isStaff}
        learners={data.rows}
        classes={data.classOptions}
        standards={data.standardOptions}
        fiscalYears={data.fiscalYearOptions}
      />
    </AppShell>
  );
}
