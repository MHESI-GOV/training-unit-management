import { createClient } from "@/lib/supabase/server";
import { byteaHexToBuffer, decryptNationalId } from "@/lib/crypto/national-id";
import { buildXlsxDataSheet } from "@/lib/xlsx-template";
import { unitCode, studentCode } from "@/lib/id-codes";
import { GENDER_LABEL, ASSESSMENT_STANDARD_LABEL } from "@/lib/labels";
import { computeAge } from "@/lib/age";
import { learnerStatusDisplay } from "@/lib/learner-status";
import { formatThaiDate, formatThaiDateTime } from "@/lib/date-format";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // §07-import-export-plan.md §4 — role is checked here at the backend, not just hidden in UI.
  if (profile?.role !== "web_master" && profile?.role !== "central_staff") {
    return new Response("forbidden", { status: 403 });
  }

  const unitId = new URL(request.url).searchParams.get("unit_id");

  // Full per-learner record so the export is usable on its own: รหัสผู้เรียน + identity + demographics
  // + training provenance (unit / รุ่น / ปีงบ / สถานะ) + certifications gained.
  let query = supabase
    .from("learners")
    .select(
      "learner_id, learner_seq, unit_id, first_name, last_name, national_id_encrypted, gender, birth_date, occupation, phone, email, address, created_at, training_units(name), enrollments(status, classes(batch_code, fiscal_year, end_date, courses(name))), assessment_results(standard_type, result)",
    );
  if (unitId) query = query.eq("unit_id", unitId);

  const { data: learners, error } = await query;
  if (error) return new Response(error.message, { status: 500 });

  // Unit code map (REGION-PROVINCE2-serial) → compose each learner's รหัสผู้เรียน (<unit>-S<seq>).
  const [{ data: units }, { data: unitProfiles }] = await Promise.all([
    supabase.from("training_units").select("unit_id, region, unit_seq"),
    supabase.from("training_unit_profiles").select("unit_id, province_name"),
  ]);
  const provinceByUnit = new Map((unitProfiles ?? []).map((p) => [p.unit_id, p.province_name]));
  const unitCodeByUnit = new Map(
    (units ?? []).map((u) => [
      u.unit_id,
      unitCode({ region: u.region, provinceName: provinceByUnit.get(u.unit_id) ?? null, unitSeq: u.unit_seq }),
    ]),
  );

  const headers = [
    "รหัสผู้เรียน",
    "ชื่อ",
    "นามสกุล",
    "เลขบัตรประชาชน",
    "เพศ",
    "วันเกิด",
    "อายุ",
    "อาชีพ",
    "เบอร์โทร",
    "อีเมล",
    "ที่อยู่",
    "หน่วยฝึกอบรม",
    "รุ่น · ปีงบ · สถานะการเรียน",
    "มาตรฐาน/คุณวุฒิที่ได้รับ",
    "วันที่สร้าง",
  ];
  const rows: (string | number | null)[][] = (learners ?? []).map((l) => {
    const nationalId = decryptNationalId(byteaHexToBuffer(l.national_id_encrypted as unknown as string));
    const age = computeAge(l.birth_date);
    const code = studentCode(unitCodeByUnit.get(l.unit_id) ?? null, l.learner_seq);
    const enrollSummary = (l.enrollments ?? [])
      .map((e) => {
        const label = learnerStatusDisplay(e.status, e.classes?.end_date ?? null).label;
        const batch = e.classes?.batch_code ? `${e.classes.batch_code} · ` : "";
        const course = e.classes?.courses?.name ?? "—";
        const fy = e.classes?.fiscal_year ? ` · ปีงบ ${e.classes.fiscal_year}` : "";
        return `${batch}${course}${fy} [${label}]`;
      })
      .join("; ");
    const standards = (l.assessment_results ?? [])
      .filter((a) => a.result === "passed")
      .map((a) => ASSESSMENT_STANDARD_LABEL[a.standard_type] ?? a.standard_type)
      .join("; ");
    return [
      code ?? "",
      l.first_name,
      l.last_name,
      nationalId,
      l.gender ? GENDER_LABEL[l.gender] ?? l.gender : "",
      formatThaiDate(l.birth_date, ""),
      age === null ? "" : age,
      l.occupation ?? "",
      l.phone ?? "",
      l.email ?? "",
      l.address ?? "",
      l.training_units?.name ?? "",
      enrollSummary,
      standards,
      formatThaiDateTime(l.created_at, ""),
    ];
  });

  // Text columns so Excel keeps them verbatim: รหัสผู้เรียน (0), เลขบัตรประชาชน (3), เบอร์โทร (8).
  const xlsx = await buildXlsxDataSheet(headers, rows, { textColumns: [0, 3, 8], sheetName: "ผู้เรียน" });

  await supabase.from("audit_log").insert({
    actor_user_id: user.id,
    action: "export_learners",
    entity_type: "learner",
    record_id: unitId ?? "all_units",
    changed_fields: [`${rows.length} rows`],
  });

  return new Response(xlsx as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="learners_export_${Date.now()}.xlsx"`,
    },
  });
}
