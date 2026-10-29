// Single place that owns how dates are shown across the whole app: dd/mm/yyyy with a Buddhist-era
// (พ.ศ. = Gregorian + 543) year. Date-only strings ("YYYY-MM-DD") are read literally (no timezone
// shift); timestamps (with a time/offset) are converted to the viewer's local time first.
//
// Storage stays ISO/Gregorian everywhere (DB columns, <input type="date"> values) — this only
// changes DISPLAY. Pair every rendered date with formatThaiDate / formatThaiDateTime.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// → [year(Gregorian), month(1-12), day, hours, minutes] or null if unparseable.
function toParts(value: string | Date | null | undefined): [number, number, number, number, number] | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return [value.getFullYear(), value.getMonth() + 1, value.getDate(), value.getHours(), value.getMinutes()];
  }
  const s = String(value).trim();
  // Has a time component / timezone → real instant, convert to local.
  if (/[T ]\d{2}:/.test(s) || s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
  }
  // Plain date "YYYY-MM-DD" (optionally with extra) → read literally, no TZ shift.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), 0, 0];
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
}

// "29/10/2569" (พ.ศ.). Returns `fallback` (default "—") for null/empty/invalid.
export function formatThaiDate(value: string | Date | null | undefined, fallback = "—"): string {
  const p = toParts(value);
  if (!p) return fallback;
  const [y, mo, d] = p;
  return `${pad(d)}/${pad(mo)}/${y + 543}`;
}

// "29/10/2569 14:05 น." (พ.ศ.). Returns `fallback` (default "—") for null/empty/invalid.
export function formatThaiDateTime(value: string | Date | null | undefined, fallback = "—"): string {
  const p = toParts(value);
  if (!p) return fallback;
  const [y, mo, d, hh, mm] = p;
  return `${pad(d)}/${pad(mo)}/${y + 543} ${pad(hh)}:${pad(mm)} น.`;
}
