import { buildXlsxTemplate } from "@/lib/xlsx-template";

export async function GET() {
  const buf = await buildXlsxTemplate([
    { header: "first_name", example: "สมชาย" },
    { header: "last_name", example: "ใจดี" },
    { header: "gender", example: "male", options: ["male", "female"] },
    { header: "affiliation", example: "คณะอุตสาหกรรมเกษตร" },
    { header: "tester_status", example: "level_1", options: ["none", "level_1", "level_2"] },
    { header: "passed_ttt", example: "true", options: ["true", "false"] },
    { header: "phone", example: "0812345678" },
    { header: "email", example: "somchai@example.com" },
  ]);

  return new Response(buf as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="instructor_import_template.xlsx"',
    },
  });
}
