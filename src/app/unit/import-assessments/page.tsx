import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { AppShell } from "@/components/layout/AppShell";
import { ImportClient } from "./import-client";

export default async function ImportAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  return (
    <AppShell profile={profile} active="import-assessments" eyebrow="นำเข้าข้อมูล" title="นำเข้าผลทดสอบมาตรฐานจากไฟล์ CSV">
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <p className="footnote" style={{ marginBottom: 20 }}>
        จับคู่ด้วยเลขบัตรประชาชน — ผู้เรียนต้องมีอยู่ในหน่วยนี้แล้ว (เพิ่มผู้เรียนที่{" "}
        <Link href={`/unit/learners?unit_id=${unitId}`}>หน้าผู้เรียน</Link> ก่อน)
      </p>
      <ImportClient unitId={unitId} />
    </AppShell>
  );
}
