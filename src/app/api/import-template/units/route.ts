import { buildXlsxTemplate } from "@/lib/xlsx-template";

// Bulk unit-import template (round 12) — one row per training unit. type/region/is_food_testing_center
// get dropdowns; the rest is free text filled in later from the per-unit data-sheet too.
export async function GET() {
  const buf = await buildXlsxTemplate([
    { header: "name", example: "มหาวิทยาลัยขอนแก่น" },
    { header: "type", example: "university", options: ["university", "vocational", "other"] },
    { header: "region", example: "northeast", options: ["north", "northeast", "central", "south", "east", "bangkok"] },
    { header: "province_name", example: "ขอนแก่น" },
    { header: "district_name", example: "เมืองขอนแก่น" },
    { header: "subdistrict_name", example: "ในเมือง" },
    { header: "house_no", example: "123" },
    { header: "road", example: "มิตรภาพ" },
    { header: "phone", example: "043000000" },
    { header: "email", example: "unit@example.ac.th" },
    { header: "coordinator_first_name", example: "สมชาย" },
    { header: "coordinator_last_name", example: "ใจดี" },
    { header: "is_food_testing_center", example: "false", options: ["true", "false"] },
    { header: "latitude", example: "16.4419" },
    { header: "longitude", example: "102.8360" },
    { header: "external_ref", example: "" },
  ]);

  return new Response(buf as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="unit_import_template.xlsx"',
    },
  });
}
