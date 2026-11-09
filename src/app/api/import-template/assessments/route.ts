import { buildXlsxTemplate } from "@/lib/xlsx-template";
import { ASSESSMENT_STANDARD_OPTIONS } from "@/lib/labels";

export async function GET() {
  const buf = await buildXlsxTemplate([
    { header: "national_id", example: "1234567890123" },
    {
      header: "standard_type",
      example: "dsd_l1",
      options: [...ASSESSMENT_STANDARD_OPTIONS],
    },
    { header: "result", example: "passed", options: ["passed", "failed", "pending"] },
    { header: "tested_at", example: "01/10/2569", text: true },
    { header: "evidence_ref", example: "ใบรับรองเลขที่ 123" },
  ]);

  return new Response(buf as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="assessment_import_template.xlsx"',
    },
  });
}
