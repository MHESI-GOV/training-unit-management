import { toCsv } from "@/lib/csv";

export async function GET() {
  const csv = toCsv([
    ["first_name", "last_name", "gender", "affiliation", "tester_status", "phone", "email"],
    ["สมชาย", "ใจดี", "male", "คณะอุตสาหกรรมเกษตร", "level_1", "0812345678", "somchai@example.com"],
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="instructor_import_template.csv"',
    },
  });
}
