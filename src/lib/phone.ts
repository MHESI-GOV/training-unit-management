// Thai phone numbers, one format everywhere:
//   mobile (06 / 08 / 09)  → 10 digits → XX-XXXX-XXXX   e.g. 08-1234-5678
//   landline (02–05, 07)   →  9 digits → XX-XXX-XXXX    e.g. 02-123-4567
// Forms, imports and server actions all store the formatted string. Old free-typed values are shown
// through formatPhone(), which reformats them when they are valid and leaves them as typed otherwise.

export const PHONE_FORMAT_HINT = "XX-XXXX-XXXX (มือถือ) หรือ XX-XXX-XXXX (เบอร์บ้าน)";
export const PHONE_ERROR = `เบอร์โทรต้องเป็นรูปแบบ ${PHONE_FORMAT_HINT}`;

const isMobile = (d: string) => /^0[689]/.test(d);

// Digits only, with the leading 0 put back when a spreadsheet dropped it (812345678 → 0812345678)
// and +66 / 66 turned into 0.
function toDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("66") && (d.length === 11 || d.length === 10)) d = "0" + d.slice(2);
  if (!d.startsWith("0") && ((d.length === 9 && /^[689]/.test(d)) || (d.length === 8 && /^[2-57]/.test(d)))) d = "0" + d;
  return d;
}

function groups(d: string): string {
  return isMobile(d)
    ? [d.slice(0, 2), d.slice(2, 6), d.slice(6, 10)].filter(Boolean).join("-")
    : [d.slice(0, 2), d.slice(2, 5), d.slice(5, 9)].filter(Boolean).join("-");
}

// Server side: empty → null; valid → formatted; anything else → error.
export function normalizePhone(raw: string | null | undefined): { value: string | null; error?: string } {
  const s = (raw ?? "").trim();
  if (!s) return { value: null };
  const d = toDigits(s);
  const ok = isMobile(d) ? /^0\d{9}$/.test(d) : /^0[2-57]\d{7}$/.test(d);
  return ok ? { value: groups(d) } : { value: null, error: PHONE_ERROR };
}

// Display: formatted when valid, otherwise the stored text unchanged.
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const n = normalizePhone(raw);
  return n.value ?? raw;
}

// While typing: keep digits, cap the length for the prefix, insert dashes as they go.
export function formatPhoneTyping(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  const capped = d.length >= 2 && !isMobile(d) ? d.slice(0, 9) : d;
  return groups(capped);
}
