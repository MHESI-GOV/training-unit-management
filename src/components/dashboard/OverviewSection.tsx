"use client";

import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { REGION_LABEL, UNIT_TYPE_LABEL } from "@/lib/labels";
import { YearFilter } from "./year-filter";
import { OverviewCards } from "./OverviewCards";
import { type Overview, type Pyramid, type DashFilters } from "@/lib/dashboard";

// Client wrapper so the fiscal year AND the click-to-filter selections (region / institution type)
// update the dashboard in place — each calls the get_dashboard_overview + get_learner_pyramid RPCs
// straight from the browser (session-aware, same role scoping as the server) and swaps the data in.
// Clicking a region row or an institution-type slice sets that filter; clicking it again clears it.

export function OverviewSection({
  initialOv,
  initialPyramid,
  years,
  initialSelected,
  unitId,
}: {
  initialOv: Overview;
  initialPyramid: Pyramid;
  years: number[];
  initialSelected: string;
  unitId?: string;
}) {
  const [ov, setOv] = useState<Overview>(initialOv);
  const [pyramid, setPyramid] = useState<Pyramid>(initialPyramid);
  const [selected, setSelected] = useState(initialSelected);
  const [filters, setFilters] = useState<DashFilters>({ region: null, type: null, testing_center: null });
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const refetch = useCallback(
    async (year: string, f: DashFilters) => {
      setLoading(true);
      const supabase = createClient();
      const args = {
        p_unit_id: unitId ?? undefined,
        p_fiscal_year: year === "all" ? undefined : Number(year),
        p_region: f.region ?? undefined,
        p_unit_type: f.type ?? undefined,
        p_testing_center: f.testing_center ?? undefined,
      };
      const [{ data: ovData }, { data: pyrData }] = await Promise.all([
        supabase.rpc("get_dashboard_overview", args),
        supabase.rpc("get_learner_pyramid", args),
      ]);
      if (ovData) setOv(ovData as Overview);
      if (pyrData) setPyramid(pyrData as Pyramid);
      setLoading(false);
    },
    [unitId],
  );

  function onYearChange(value: string) {
    setSelected(value);
    refetch(value, filters);
    const params = new URLSearchParams(searchParams.toString());
    params.set("fy", value);
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  // Toggle a filter dimension: picking the active value again clears it.
  function onFilter(dim: "region" | "type" | "testing_center", value: string) {
    const next: DashFilters = { ...filters, [dim]: filters[dim] === value ? null : value };
    setFilters(next);
    refetch(selected, next);
  }

  function clearFilter(dim: "region" | "type" | "testing_center") {
    const next = { ...filters, [dim]: null };
    setFilters(next);
    refetch(selected, next);
  }

  const hasFilter = filters.region || filters.type || filters.testing_center;

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <YearFilter years={years} selected={selected} onChange={onYearChange} />
        {hasFilter && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="footnote">กำลังกรอง:</span>
            {filters.region && (
              <FilterChip label={`ภูมิภาค: ${REGION_LABEL[filters.region] ?? filters.region}`} onClear={() => clearFilter("region")} />
            )}
            {filters.type && (
              <FilterChip label={`ประเภท: ${UNIT_TYPE_LABEL[filters.type] ?? filters.type}`} onClear={() => clearFilter("type")} />
            )}
            {filters.testing_center && (
              <FilterChip
                label={`ศูนย์ทดสอบฯ สาขาอาหาร: ${filters.testing_center === "yes" ? "เป็น" : "ไม่เป็น"}`}
                onClear={() => clearFilter("testing_center")}
              />
            )}
          </div>
        )}
      </div>
      <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity .15s ease" }}>
        <OverviewCards ov={ov} pyramid={pyramid} filters={filters} onFilter={onFilter} />
      </div>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 6px 4px 12px",
        borderRadius: 999, background: "#e5f0fc", color: "#1a4e86", fontSize: 12.5, fontWeight: 600,
      }}
    >
      {label}
      <button
        onClick={onClear}
        aria-label="ล้างตัวกรอง"
        style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: "inherit", padding: 2 }}
      >
        <X size={14} />
      </button>
    </span>
  );
}
