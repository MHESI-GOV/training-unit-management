import { isoDateInThailand } from "./date-format";

// Thai government fiscal year ("ปีงบประมาณ"): 1 Oct – 30 Sep, numbered by the Buddhist-era (BE)
// year it ends in. E.g. 1 Oct 2025 – 30 Sep 2026 is FY2569 (BE). October onward belongs to the
// NEXT BE year's fiscal year. The DB stores only the int; this is the single place that owns the
// Oct–Sep boundary and BE conversion.

export function thaiFiscalYear(date: Date = new Date()): number {
  const iso = isoDateInThailand(date);
  const beYear = Number(iso.slice(0, 4)) + 543;
  return Number(iso.slice(5, 7)) >= 10 ? beYear + 1 : beYear;
}

// The Gregorian [start, endExclusive) instants covering a given BE fiscal year, for any
// date-range filtering we add later (e.g. "learners trained during FY X").
export function fiscalYearRange(fiscalYearBE: number): { start: Date; endExclusive: Date } {
  const endGregorian = fiscalYearBE - 543; // the calendar year the FY ends in
  return {
    start: new Date(endGregorian - 1, 9, 1), // 1 Oct of the prior calendar year
    endExclusive: new Date(endGregorian, 9, 1), // 1 Oct of the ending calendar year
  };
}

export function formatFiscalYear(fiscalYearBE: number): string {
  return `ปีงบประมาณ ${fiscalYearBE}`;
}
