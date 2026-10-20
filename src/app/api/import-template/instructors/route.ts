import { toCsv } from "@/lib/csv";

export async function GET() {
  const csv = toCsv([
    ["name", "phone", "email", "role_in_class"],
    ["อาจารย์สมชาย ใจดี", "0812345678", "somchai@example.com", "วิทยากร"],
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="instructor_import_template.csv"',
    },
  });
}
