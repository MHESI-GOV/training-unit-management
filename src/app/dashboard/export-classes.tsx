"use client";

export function ExportClasses({ unitId }: { unitId: string }) {
  const href = unitId ? `/api/export/classes?unit_id=${unitId}` : "/api/export/classes";

  return (
    <div style={{ marginTop: 12 }}>
      <a href={href}>
        <button type="button">ส่งออกรุ่นฝึกอบรม+วิทยากร (CSV){unitId ? "" : " — ทุกหน่วย"}</button>
      </a>
    </div>
  );
}
