import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { ImportClient } from "./import-client";

export default async function ImportClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff } = await resolvePageUnit(unit_id);

  return (
    <main style={{ maxWidth: 720, margin: "3rem auto", fontFamily: "system-ui" }}>
      {isStaff && (
        <p>
          <Link href="/admin/units">กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <h1>นำเข้ารุ่นฝึกอบรมจากไฟล์ CSV</h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        จับคู่ด้วยชื่อหลักสูตร — หลักสูตรต้องมีอยู่แล้วที่{" "}
        <Link href="/courses">หน้าหลักสูตร</Link> ก่อน
      </p>
      <ImportClient unitId={unitId} />
    </main>
  );
}
