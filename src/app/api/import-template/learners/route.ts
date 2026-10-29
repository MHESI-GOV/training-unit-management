import { buildXlsxTemplate } from "@/lib/xlsx-template";

export async function GET() {
  const buf = await buildXlsxTemplate([
    { header: "first_name", example: "สมชาย" },
    { header: "last_name", example: "ใจดี" },
    { header: "national_id", example: "1234567890123" },
    { header: "birth_date", example: "1990-05-21" },
    { header: "gender", example: "male", options: ["male", "female"] },
    { header: "occupation", example: "พ่อครัว/แม่ครัว" },
    { header: "phone", example: "0812345678" },
    { header: "email", example: "somchai@example.com" },
    { header: "address", example: "123 ถ.ตัวอย่าง" },
  ]);

  return new Response(buf as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="learner_import_template.xlsx"',
    },
  });
}
