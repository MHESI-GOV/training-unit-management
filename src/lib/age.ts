import { isoDateInThailand } from "./date-format";

/**
 * Compute full years of age from an ISO date string (YYYY-MM-DD) as of `asOf`
 * (defaults to today). Returns null for a missing/invalid/future birth date so
 * the UI can show "—" rather than a bogus number. Age is never stored — only
 * birth_date is — so this is the single source of truth for displaying อายุ.
 */
export function computeAge(birthDate: string | null | undefined, asOf: Date = new Date()): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const today = isoDateInThailand(asOf);
  if (birthDate > today) return null;

  // ISO strings compare correctly as text, so "MM-DD" tells whether this year's birthday has passed.
  const age = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return today.slice(5) < birthDate.slice(5) ? age - 1 : age;
}

/** Age formatted for display, e.g. "34 ปี", or "—" when unknown. */
export function formatAge(birthDate: string | null | undefined, asOf: Date = new Date()): string {
  const age = computeAge(birthDate, asOf);
  return age === null ? "—" : `${age} ปี`;
}
