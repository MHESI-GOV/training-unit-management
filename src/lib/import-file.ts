import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";

// Reads an uploaded import file (either .xlsx — filled from our dropdown templates — or .csv) into
// a uniform array of header→value string records, so every importer can accept both formats with
// no per-importer branching. Empty rows are skipped; every value is trimmed to a string.

function cellToString(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    // Normalise to YYYY-MM-DD (the format the importers validate), using UTC parts so a date-only
    // cell doesn't drift a day across timezones.
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if ("text" in o && o.text != null) return String(o.text);
    if ("result" in o && o.result != null) return String(o.result);
    if ("richText" in o && Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
    }
    if ("hyperlink" in o && o.hyperlink != null) return String(o.hyperlink);
    return "";
  }
  return String(v);
}

export async function readUploadedRows(
  file: File,
): Promise<{ rows?: Record<string, string>[]; error?: string }> {
  const name = file.name.toLowerCase();
  const isXlsx =
    name.endsWith(".xlsx") ||
    file.type.includes("spreadsheetml") ||
    file.type.includes("excel");

  if (isXlsx) {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) return { error: "ไม่พบชีตข้อมูลในไฟล์ Excel" };

      const headers: string[] = [];
      ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
        headers[col - 1] = cellToString(cell.value).trim();
      });
      if (headers.filter(Boolean).length === 0) return { error: "แถวหัวตาราง (แถวแรก) ว่างเปล่า" };

      const rows: Record<string, string>[] = [];
      for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const obj: Record<string, string> = {};
        let hasValue = false;
        headers.forEach((h, i) => {
          if (!h) return;
          const val = cellToString(row.getCell(i + 1).value).trim();
          obj[h] = val;
          if (val) hasValue = true;
        });
        if (hasValue) rows.push(obj);
      }
      return { rows };
    } catch (e) {
      return { error: `อ่านไฟล์ Excel ไม่สำเร็จ: ${e instanceof Error ? e.message : "ไม่ทราบสาเหตุ"}` };
    }
  }

  // CSV
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) return { error: `อ่านไฟล์ไม่สำเร็จ: ${parsed.errors[0].message}` };
  return { rows: parsed.data };
}
