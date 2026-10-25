"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { YearFilter } from "./year-filter";
import { OverviewCards } from "./OverviewCards";
import { type Overview } from "@/lib/dashboard";

// Client wrapper so changing the fiscal year updates ONLY the overview cards — it calls the
// get_dashboard_overview RPC straight from the browser (session-aware, same role scoping as the
// server) and swaps the data in place. No router navigation = no full-page refresh/scroll jump.
// The address bar's `?fy=` is kept in sync via history.replaceState so a manual reload / shared
// link still lands on the right year (the server reads it on reload).
export function OverviewSection({
  initialOv,
  years,
  initialSelected,
  unitId,
}: {
  initialOv: Overview;
  years: number[];
  initialSelected: string;
  unitId?: string;
}) {
  const [ov, setOv] = useState<Overview>(initialOv);
  const [selected, setSelected] = useState(initialSelected);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function onYearChange(value: string) {
    setSelected(value);
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("get_dashboard_overview", {
      p_unit_id: unitId ?? undefined,
      p_fiscal_year: value === "all" ? undefined : Number(value),
    });
    if (data) setOv(data as Overview);
    setLoading(false);

    const params = new URLSearchParams(searchParams.toString());
    params.set("fy", value);
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <YearFilter years={years} selected={selected} onChange={onYearChange} />
      </div>
      <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity .15s ease" }}>
        <OverviewCards ov={ov} />
      </div>
    </div>
  );
}
