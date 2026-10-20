"use client";

export function ExportClasses({ unitId }: { unitId: string }) {
  const href = unitId ? `/api/export/classes?unit_id=${unitId}` : "/api/export/classes";

  return (
    <a href={href} className="btn secondary">
      ส่งออกรุ่นฝึกอบรม+วิทยากร (CSV){unitId ? "" : " — ทุกหน่วย"}
    </a>
  );
}
