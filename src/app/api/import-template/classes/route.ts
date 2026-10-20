import { toCsv } from "@/lib/csv";

export async function GET() {
  const csv = toCsv([
    ["course_name", "start_date", "end_date", "seat_count", "external_ref"],
    ["หลักสูตรทดสอบ", "2026-11-01", "2026-11-05", "20", ""],
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="class_import_template.csv"',
    },
  });
}
