"use client";

import { useRouter } from "next/navigation";

export function UnitFilter({
  units,
  selected,
}: {
  units: { unit_id: string; name: string }[];
  selected: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selected}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `/dashboard?unit_id=${value}` : "/dashboard");
      }}
    >
      <option value="">ทุกหน่วย (ภาพรวมโครงการ)</option>
      {units.map((u) => (
        <option key={u.unit_id} value={u.unit_id}>
          {u.name}
        </option>
      ))}
    </select>
  );
}
