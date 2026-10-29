import { buildXlsxTemplate } from "@/lib/xlsx-template";

export async function GET() {
  const buf = await buildXlsxTemplate([
    { header: "national_id", example: "1234567890123" },
    {
      header: "standard_type",
      example: "dsd_l1",
      options: ["dsd_l1", "anamai_food_handler", "anamai_food_contact", "professional_qualification", "other"],
    },
    { header: "result", example: "passed", options: ["passed", "failed", "pending"] },
    { header: "tested_at", example: "2026-10-01" },
    { header: "evidence_ref", example: "ใบรับรองเลขที่ 123" },
  ]);

  return new Response(buf as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="assessment_import_template.xlsx"',
    },
  });
}
