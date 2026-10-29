import "server-only";
import ExcelJS from "exceljs";

// Builds a downloadable .xlsx import template. Columns flagged with `options` get an Excel
// data-validation dropdown (list) on rows 2..N, so "must-choose" fields (gender, mode,
// standard_type, result, tester_status, passed_ttt …) can only be picked from valid values.
// The import side (src/lib/import-file.ts) reads either .xlsx or .csv, so a filled template can be
// uploaded directly.
export type TemplateColumn = {
  header: string; // machine column name the importer reads (e.g. "gender")
  example?: string; // one sample value shown on row 2
  options?: string[]; // allowed values → dropdown; ascii codes only (no commas inside a value)
};

const VALIDATION_LAST_ROW = 500;

export async function buildXlsxTemplate(
  columns: TemplateColumn[],
  sheetName = "นำเข้าข้อมูล",
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  ws.addRow(columns.map((c) => c.header));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle" };
  ws.addRow(columns.map((c) => c.example ?? ""));

  columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.max(14, c.header.length + 4, (c.example?.length ?? 0) + 2);
    if (c.options && c.options.length > 0) {
      const letter = col.letter;
      for (let r = 2; r <= VALIDATION_LAST_ROW; r++) {
        ws.getCell(`${letter}${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`"${c.options.join(",")}"`],
          showErrorMessage: true,
          errorStyle: "error",
          errorTitle: "ค่าไม่ถูกต้อง",
          error: `กรุณาเลือกจากรายการ: ${c.options.join(" / ")}`,
        };
      }
    }
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// Builds a real .xlsx data export (not a blank template). Columns listed in `textColumns`
// (0-indexed) are forced to Text format ('@') so Excel never mangles them — a 13-digit national
// ID stays "4156486000123" (no 4.15E+12 scientific notation) and a phone keeps its leading zero.
// Values are written as given; pass national-id / phone / codes as strings.
export async function buildXlsxDataSheet(
  headers: string[],
  rows: (string | number | null)[][],
  opts: { textColumns?: number[]; sheetName?: string } = {},
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opts.sheetName ?? "ข้อมูล");
  const textCols = new Set(opts.textColumns ?? []);

  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };
  for (const r of rows) ws.addRow(r);

  headers.forEach((h, i) => {
    const col = ws.getColumn(i + 1);
    let w = h.length + 2;
    for (const r of rows) {
      const v = r[i];
      if (v != null) w = Math.max(w, String(v).length + 2);
    }
    col.width = Math.min(Math.max(12, w), 60);
    if (textCols.has(i)) col.numFmt = "@"; // Text format — the belt to the string-cell braces
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
