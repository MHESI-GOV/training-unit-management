import { toCsv } from "@/lib/csv";

export async function GET() {
  const csv = toCsv([
    ["first_name", "last_name", "national_id", "birth_date", "phone", "email", "address"],
    ["สมชาย", "ใจดี", "1234567890123", "1990-05-21", "0812345678", "somchai@example.com", "123 ถ.ตัวอย่าง"],
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="learner_import_template.csv"',
    },
  });
}
