import { buildXlsxTemplate } from "@/lib/xlsx-template";

export async function GET() {
  const buf = await buildXlsxTemplate([
    { header: "course_name", example: "หลักสูตรทดสอบ" },
    { header: "name", example: "รุ่นที่ 1/2569" },
    { header: "start_date", example: "2026-11-01" },
    { header: "end_date", example: "2026-11-05" },
    { header: "schedule_time", example: "09:00–16:00 จ.–ศ." },
    { header: "seat_count", example: "20" },
    { header: "mode", example: "onsite", options: ["onsite", "online", "hybrid"] },
    { header: "location", example: "อาคารฝึกอบรม ห้อง 101" },
    { header: "note", example: "" },
    { header: "external_ref", example: "" },
  ]);

  return new Response(buf as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="class_import_template.xlsx"',
    },
  });
}
