import { toCsv } from "@/lib/csv";

export async function GET() {
  const csv = toCsv([
    ["national_id", "standard_type", "result", "tested_at", "evidence_ref"],
    ["1234567890123", "dsd_l1", "passed", "2026-10-01", "ใบรับรองเลขที่ 123"],
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="assessment_import_template.csv"',
    },
  });
}
