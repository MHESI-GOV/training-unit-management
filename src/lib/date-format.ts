// Single place that owns how dates look across the whole app: DD/MM/YYYY with a Buddhist-era year
// (พ.ศ. = Gregorian + 543).
//
// Storage stays ISO/Gregorian everywhere (DB columns, form values, import rows). Only what people see
// and type is พ.ศ.: convert at the edge with formatThaiDate / formatThaiDateTime (out) and
// parseThaiDate / parseImportDate (in). Dashboard SQL relies on Gregorian dates, so a พ.ศ. year must
// never reach the database. ปีงบประมาณ is a different thing: it is already stored as a พ.ศ. integer, so
// it never goes through these helpers.
//
// Timestamps are always shown in Thai time: on Vercel, server-rendered pages and export routes run in
// UTC, so "local time" would show 02:00 Thai time as the previous day.
const TIME_ZONE = "Asia/Bangkok";

const BE_OFFSET = 543;
// Accepted Gregorian years. Anything outside is a typing mistake, and the gap between the two ranges
// is what tells a พ.ศ. year from a ค.ศ. year: 2400-2700 as พ.ศ. is 1857-2157 as ค.ศ.
const MIN_CE_YEAR = 1857;
const MAX_CE_YEAR = 2157;
const MIN_BE_YEAR = MIN_CE_YEAR + BE_OFFSET;
const MAX_BE_YEAR = MAX_CE_YEAR + BE_OFFSET;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const bangkokParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  calendar: "gregory",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// → [year(Gregorian), month(1-12), day, hours, minutes] in Thai time.
function instantToParts(d: Date): [number, number, number, number, number] {
  const parts = bangkokParts.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return [get("year"), get("month"), get("day"), get("hour"), get("minute")];
}

function toParts(value: string | Date | null | undefined): [number, number, number, number, number] | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : instantToParts(value);
  const s = String(value).trim();
  // Has a time component / timezone → real instant.
  if (/[T ]\d{2}:/.test(s) || s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : instantToParts(d);
  }
  // Plain date → read literally, no timezone shift. Anything else isn't guessed at: new Date() reads
  // "05/06/2533" as 6 May of the year 2533.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), 0, 0] : null;
}

// "29/10/2569" (พ.ศ.). Returns `fallback` (default "—") for null/empty/invalid.
export function formatThaiDate(value: string | Date | null | undefined, fallback = "—"): string {
  const p = toParts(value);
  if (!p) return fallback;
  const [y, mo, d] = p;
  return `${pad(d)}/${pad(mo)}/${y + BE_OFFSET}`;
}

// "29/10/2569 14:05 น." (พ.ศ.). Returns `fallback` (default "—") for null/empty/invalid.
export function formatThaiDateTime(value: string | Date | null | undefined, fallback = "—"): string {
  const p = toParts(value);
  if (!p) return fallback;
  const [y, mo, d, hh, mm] = p;
  return `${pad(d)}/${pad(mo)}/${y + BE_OFFSET} ${pad(hh)}:${pad(mm)} น.`;
}

// Today (or `d`) as a Gregorian "YYYY-MM-DD" in Thai time, for comparing against date columns.
export function isoDateInThailand(d: Date = new Date()): string {
  const [y, mo, day] = instantToParts(d);
  return `${y}-${pad(mo)}-${pad(day)}`;
}

function toIso(ceYear: number, month: number, day: number): string | null {
  if (ceYear < MIN_CE_YEAR || ceYear > MAX_CE_YEAR) return null;
  const d = new Date(Date.UTC(ceYear, month - 1, day));
  // Date.UTC rolls 31/02 over to March, which is how an impossible date shows up.
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${ceYear}-${pad(month)}-${pad(day)}`;
}

export const THAI_DATE_FORMAT_HINT = "วว/ดด/ปปปป (พ.ศ.) เช่น 21/05/2533";

export type ParsedDate = { iso: string; error?: undefined } | { iso?: undefined; error: string };

// What people type: DD/MM/YYYY with a พ.ศ. year → Gregorian ISO. A year in the ค.ศ. range is refused
// rather than converted, because 21/05/1990 can only be a mistake about which calendar to use.
export function parseThaiDate(raw: string): ParsedDate {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return { error: `รูปแบบวันที่ต้องเป็น ${THAI_DATE_FORMAT_HINT}` };
  const year = Number(m[3]);
  if (year < MIN_BE_YEAR || year > MAX_BE_YEAR) {
    return { error: `ปี ${m[3]} ไม่ถูกต้อง ต้องเป็นปี พ.ศ. รูปแบบ ${THAI_DATE_FORMAT_HINT}` };
  }
  const iso = toIso(year - BE_OFFSET, Number(m[2]), Number(m[1]));
  return iso ? { iso } : { error: `ไม่มีวันที่ ${s} ในปฏิทิน` };
}

// What import files contain. DD/MM/YYYY (พ.ศ.) is the documented format. Year-first dates are still
// accepted, because templates downloaded before this format changed use them, and because
// import-file.ts hands real Excel date cells over in that shape. There the year can safely decide the
// calendar: a date typed as 21/05/2533 in non-Thai Excel becomes a date cell in the Gregorian year 2533.
export function parseImportDate(raw: string): ParsedDate {
  const s = raw.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return parseThaiDate(s);
  const year = Number(m[1]);
  const iso = toIso(year >= MIN_BE_YEAR ? year - BE_OFFSET : year, Number(m[2]), Number(m[3]));
  return iso ? { iso } : { error: `ไม่มีวันที่ ${s} ในปฏิทิน หรือปีไม่ถูกต้อง` };
}

// Server-side check on a form's "YYYY-MM-DD" value, so a พ.ศ. year or an impossible date can't be
// stored even if a request skips the date field's own validation.
export function isValidIsoDate(value: string): boolean {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return !!m && toIso(Number(m[1]), Number(m[2]), Number(m[3])) === value;
}
