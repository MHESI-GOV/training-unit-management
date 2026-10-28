// Shape returned by the get_dashboard_overview() RPC (a single jsonb object), shared by the
// authenticated dashboard (src/app/page.tsx) and the public home (components/home/PublicHome).
// Suppressible people-counts come back as number | null (null = suppressed for Executive / the
// anonymous public view, ST-4).
export type Overview = {
  total_units: number;
  units_by_region: Record<string, number>;
  units_by_type: Record<string, number>;
  total_learners: number | null;
  learners_by_region: Record<string, number | null>;
  cert_anamai_contact: number | null;
  cert_professional_q: number | null;
  cert_dsd_l1: number | null;
  // Learner status, 3 states derived from the class timeline + withdrawal (see
  // get_dashboard_overview / src/lib/learner-status.ts). Together they partition total_learners so
  // the "สถานะการเรียน" donut reconciles with the "จำนวนผู้เรียน" headline. null = suppressed (Executive).
  status_in_progress: number | null; // อยู่ระหว่างเรียน
  status_finished: number | null; // เรียนเสร็จแล้ว
  status_withdrawn: number | null; // ถอนตัว
  // Fiscal-year participation ("active units") for the most recent round. participation_fiscal_year
  // is null when no round has been opened yet; active_units/participation_total are org-level counts
  // (no PII) so they are never suppressed.
  participation_fiscal_year: number | null;
  participation_round_open: boolean | null;
  active_units: number;
  participation_total: number;
  pins: { unit_id: string; name: string; region: string; type: string; province: string | null; lat: number; lng: number }[];
  latest_units: { unit_id: string; name: string; region: string; type: string; status: string }[];
};

// Population-pyramid rows (age band × gender) from get_learner_pyramid(). Counts are suppressed
// to 0 for small cells in the Executive / public view, same as the other learner metrics.
export type PyramidBand = { band: string; male: number; female: number; other: number };
export type Pyramid = PyramidBand[];

// Active click-to-filter selections on the dashboard (region row / institution-type slice).
export type DashFilters = { region: string | null; type: string | null };

export const SUPPRESSED = "ข้อมูลน้อยเกินไปที่จะแสดงผลได้";

// Resolve the dashboard year dropdown from the `fy` query param against the list of years that
// have data (newest first). Default = latest year; "all" = every year (p_fiscal_year null); an
// unknown/missing value falls back to the latest year (or "all" when there is no data at all).
// `selected` is the <select> value; `param` is what to pass to get_dashboard_overview.
export function resolveFiscalYear(
  fy: string | undefined,
  years: number[],
): { selected: string; param: number | null } {
  if (fy === "all") return { selected: "all", param: null };
  if (fy && years.includes(Number(fy))) return { selected: fy, param: Number(fy) };
  if (years.length > 0) return { selected: String(years[0]), param: years[0] };
  return { selected: "all", param: null };
}

export function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return SUPPRESSED;
  return v.toLocaleString("th-TH");
}

// Sum of the 3 certification headcounts for the "มาตรฐานที่ได้รับ" headline. If any component is
// suppressed (null), the total is suppressed too — otherwise it would leak the hidden value back
// out by subtraction.
export function totalCerts(ov: Overview): number | null {
  if (ov.cert_anamai_contact === null || ov.cert_professional_q === null || ov.cert_dsd_l1 === null) {
    return null;
  }
  return ov.cert_anamai_contact + ov.cert_professional_q + ov.cert_dsd_l1;
}
