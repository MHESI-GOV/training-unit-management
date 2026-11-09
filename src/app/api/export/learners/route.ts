import { createClient } from "@/lib/supabase/server";
import { byteaHexToBuffer, decryptNationalId } from "@/lib/crypto/national-id";
import { buildXlsxDataSheet } from "@/lib/xlsx-template";
import { unitCode, studentCode, classCode } from "@/lib/id-codes";
import { GENDER_LABEL, ASSESSMENT_STANDARD_LABEL, ASSESSMENT_RESULT_LABEL } from "@/lib/labels";
import { computeAge } from "@/lib/age";
import { learnerStatusDisplay } from "@/lib/learner-status";
import { formatThaiDate, formatThaiDateTime } from "@/lib/date-format";

const SOURCE_LABEL: Record<string, string> = {
  unit_self_entry: "กรอกในระบบ",
  unit_import_file: "นำเข้าจากไฟล์",
};

// Every standard gets its own result + test-date columns, in this order.
const STANDARDS = ["dsd_l1", "anamai_food_handler", "anamai_food_contact", "professional_qualification", "other"] as const;

// Characters Windows/macOS reject in file names.
function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

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

  const params = new URL(request.url).searchParams;
  const unitId = params.get("unit_id") || null;
  const fyRaw = params.get("fy");
  // fiscal_year is already พ.ศ. Missing / "all" = every year.
  const fiscalYear = fyRaw && /^\d{4}$/.test(fyRaw) ? Number(fyRaw) : null;

  // Every learner column (province/district/subdistrict ids are never filled by the app, so they
  // are left out) + each enrollment's class + certification + every standard's result.
  let query = supabase
    .from("learners")
    .select(
      "learner_id, learner_seq, unit_id, first_name, last_name, national_id_encrypted, gender, birth_date, occupation, phone, email, address, source, external_ref, created_at, training_units(name), enrollments(status, applied_at, certification_records(certified_at, certificate_ref), classes(batch_code, name, fiscal_year, start_date, end_date, courses(name))), assessment_results(standard_type, result, tested_at)",
    );
  if (unitId) query = query.eq("unit_id", unitId);

  const { data: learners, error } = await query.order("learner_seq", { ascending: true });
  if (error) return new Response(error.message, { status: 500 });

  // Unit code map (REGION-PROVINCE2-serial) → compose each learner's รหัสผู้เรียน (<unit>-S<seq>).
  const [{ data: units }, { data: unitProfiles }] = await Promise.all([
    supabase.from("training_units").select("unit_id, name, region, unit_seq"),
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
    "รหัสหน่วยฝึกอบรม",
    "หน่วยฝึกอบรม",
    "ปีงบประมาณ",
    "รหัสรุ่น",
    "ชื่อรุ่น",
    "หลักสูตร",
    "วันเริ่มเรียน",
    "วันสิ้นสุด",
    "วันที่ลงทะเบียน",
    "สถานะการเรียน",
    "วันที่ได้รับวุฒิบัตร",
    "เลขที่วุฒิบัตร",
    ...STANDARDS.flatMap((s) => [ASSESSMENT_STANDARD_LABEL[s] ?? s, `${ASSESSMENT_STANDARD_LABEL[s] ?? s} — วันที่ทดสอบ`]),
    "ช่องทางบันทึก",
    "รหัสอ้างอิงเดิม",
    "วันที่สร้าง",
  ];

  // One row per learner per class in scope, so รุ่น / ปีงบ / สถานะ each get their own column. With a
  // fiscal year picked, only that year's classes count and learners with none are left out; with
  // every year, a learner with no class still gets one row.
  const rows: (string | number | null)[][] = [];
  for (const l of learners ?? []) {
    const enrollments = (l.enrollments ?? []).filter(
      (e) => fiscalYear == null || e.classes?.fiscal_year === fiscalYear,
    );
    if (fiscalYear != null && enrollments.length === 0) continue;

    const nationalId = decryptNationalId(byteaHexToBuffer(l.national_id_encrypted as unknown as string));
    const age = computeAge(l.birth_date);
    const uCode = unitCodeByUnit.get(l.unit_id) ?? null;

    // Per standard: a passed result wins; otherwise the most recently tested one.
    const standardCells = STANDARDS.flatMap((s) => {
      const results = (l.assessment_results ?? []).filter((a) => a.standard_type === s);
      const pick =
        results.find((a) => a.result === "passed") ??
        [...results].sort((a, b) => (b.tested_at ?? "").localeCompare(a.tested_at ?? ""))[0];
      return pick ? [ASSESSMENT_RESULT_LABEL[pick.result] ?? pick.result, formatThaiDate(pick.tested_at, "")] : ["", ""];
    });

    const learnerCells = [
      studentCode(uCode, l.learner_seq) ?? "",
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
      uCode ?? "",
      l.training_units?.name ?? "",
    ];
    const tailCells = [
      ...standardCells,
      SOURCE_LABEL[l.source] ?? l.source ?? "",
      l.external_ref ?? "",
      formatThaiDateTime(l.created_at, ""),
    ];

    const classRows = enrollments.length > 0 ? enrollments : [null];
    for (const e of classRows) {
      const cls = e?.classes ?? null;
      // One certification record per enrollment (unique enrollment_id), so PostgREST returns an object.
      const cert = e?.certification_records ?? null;
      rows.push([
        ...learnerCells,
        cls?.fiscal_year ?? "",
        cls ? classCode(uCode, cls.batch_code) ?? "" : "",
        cls?.name ?? "",
        cls?.courses?.name ?? "",
        formatThaiDate(cls?.start_date ?? null, ""),
        formatThaiDate(cls?.end_date ?? null, ""),
        formatThaiDate(e?.applied_at ?? null, ""),
        e ? learnerStatusDisplay(e.status, cls?.end_date ?? null).label : "",
        formatThaiDate(cert?.certified_at ?? null, ""),
        cert?.certificate_ref ?? "",
        ...tailCells,
      ]);
    }
  }

  // Text columns so Excel keeps them verbatim: รหัสผู้เรียน, เลขบัตรประชาชน, เบอร์โทร, รหัสหน่วย, รหัสรุ่น, เลขที่วุฒิบัตร.
  const textColumns = ["รหัสผู้เรียน", "เลขบัตรประชาชน", "เบอร์โทร", "รหัสหน่วยฝึกอบรม", "รหัสรุ่น", "เลขที่วุฒิบัตร", "รหัสอ้างอิงเดิม"].map((h) =>
    headers.indexOf(h),
  );
  const xlsx = await buildXlsxDataSheet(headers, rows, { textColumns, sheetName: "ผู้เรียน" });

  await supabase.from("audit_log").insert({
    actor_user_id: user.id,
    action: "export_learners",
    entity_type: "learner",
    record_id: unitId ?? "all_units",
    changed_fields: [`${rows.length} rows`, fiscalYear ? `fy:${fiscalYear}` : "fy:all"],
  });

  // File name = unit name + fiscal year, e.g. "วิทยาลัยอาชีวศึกษาเชียงใหม่_ปีงบ2570.xlsx".
  const unitName = unitId ? (units ?? []).find((u) => u.unit_id === unitId)?.name ?? "หน่วยฝึกอบรม" : "ทุกหน่วยฝึกอบรม";
  const fileName = `${safeFileName(unitName)}_${fiscalYear ? `ปีงบ${fiscalYear}` : "ทุกปีงบ"}.xlsx`;
  const asciiFallback = `learners_${fiscalYear ?? "all"}.xlsx`;

  return new Response(xlsx as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
