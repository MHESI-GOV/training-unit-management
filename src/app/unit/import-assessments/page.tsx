import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { ImportClient } from "./import-client";

export default async function ImportAssessmentsPage({
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
      <h1>นำเข้าผลทดสอบมาตรฐานจากไฟล์ CSV</h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        จับคู่ด้วยเลขบัตรประชาชน — ผู้เรียนต้องมีอยู่ในหน่วยนี้แล้ว (เพิ่มผู้เรียนที่{" "}
        <Link href={`/unit/learners?unit_id=${unitId}`}>หน้าผู้เรียน</Link> ก่อน)
      </p>
      <ImportClient unitId={unitId} />
    </main>
  );
}
