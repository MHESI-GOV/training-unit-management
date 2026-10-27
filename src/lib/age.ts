/**
 * Compute full years of age from an ISO date string (YYYY-MM-DD) as of `asOf`
 * (defaults to today). Returns null for a missing/invalid/future birth date so
 * the UI can show "—" rather than a bogus number. Age is never stored — only
 * birth_date is — so this is the single source of truth for displaying อายุ.
 */
export function computeAge(birthDate: string | null | undefined, asOf: Date = new Date()): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  if (birth > asOf) return null;

  let age = asOf.getFullYear() - birth.getFullYear();
  const beforeBirthdayThisYear =
    asOf.getMonth() < birth.getMonth() ||
    (asOf.getMonth() === birth.getMonth() && asOf.getDate() < birth.getDate());
  if (beforeBirthdayThisYear) age -= 1;
  return age;
}

/** Age formatted for display, e.g. "34 ปี", or "—" when unknown. */
export function formatAge(birthDate: string | null | undefined, asOf: Date = new Date()): string {
  const age = computeAge(birthDate, asOf);
  return age === null ? "—" : `${age} ปี`;
}
