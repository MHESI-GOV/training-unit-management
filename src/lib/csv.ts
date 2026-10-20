// §07-import-export-plan.md §4 — CSV formula injection: escape any field starting with
// =, +, -, @ before writing, and keep numeric-looking codes (unit/class refs) as text so
// leading zeros survive a spreadsheet re-open.
const DANGEROUS_PREFIX = /^[=+\-@]/;

export function escapeCsvField(value: string | number | null | undefined): string {
  let str = value === null || value === undefined ? "" : String(value);
  if (DANGEROUS_PREFIX.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsvField).join(",");
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  // BOM so Excel opens the file as UTF-8 instead of guessing a Thai-hostile codepage
  return "﻿" + rows.map(toCsvRow).join("\r\n");
}
