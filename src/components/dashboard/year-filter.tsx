"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatFiscalYear } from "@/lib/fiscal-year";

// ตัวเลือกปีงบประมาณกลางด้านบน dashboard/Home. ค่าที่เลือกเก็บใน query param `fy`
// ("all" = ทุกปี, หรือเลขปีงบ BE). รักษา param อื่น (เช่น unit_id) ไว้เสมอ.
export function YearFilter({ years, selected }: { years: number[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("fy", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border, #e4e4ef)",
          borderRadius: 999,
          padding: "6px 8px 6px 16px",
          boxShadow: "0 1px 2px rgba(16,16,40,.04)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>ปีงบประมาณ</span>
        <select
          className="field"
          style={{ border: "none", borderRadius: 999, padding: "6px 10px", fontWeight: 600, minWidth: 150, cursor: "pointer" }}
          value={selected}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="all">ทุกปี</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {formatFiscalYear(y)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
