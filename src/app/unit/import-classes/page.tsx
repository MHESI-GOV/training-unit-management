import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { AppShell } from "@/components/layout/AppShell";
import { ImportClient } from "./import-client";

export default async function ImportClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  return (
    <AppShell profile={profile} active="import-classes" eyebrow="นำเข้าข้อมูล" title="นำเข้ารุ่นฝึกอบรมจากไฟล์ CSV">
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <p className="footnote" style={{ marginBottom: 20 }}>
        จับคู่ด้วยชื่อหลักสูตร — หลักสูตรต้องมีอยู่แล้วที่ <Link href="/courses">หน้าหลักสูตร</Link> ก่อน
      </p>
      <ImportClient unitId={unitId} />
    </AppShell>
  );
}
