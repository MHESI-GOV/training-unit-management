import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { byteaHexToBuffer, decryptNationalId, maskNationalId } from "@/lib/crypto/national-id";
import { buildXlsxDataSheet } from "@/lib/xlsx-template";
import { unitCode, studentCode, classCode } from "@/lib/id-codes";
import { GENDER_LABEL, ASSESSMENT_STANDARD_LABEL, ASSESSMENT_STANDARD_OPTIONS, ASSESSMENT_RESULT_LABEL } from "@/lib/labels";
import { computeAge } from "@/lib/age";
import { learnerStatusDisplay } from "@/lib/learner-status";
import { formatThaiDate, formatThaiDateTime } from "@/lib/date-format";
import { formatPhone } from "@/lib/phone";

// The one learner export. Every "ส่งออกรายชื่อผู้เรียน" button (dashboard, all-learners page, a unit's
// learner page) posts here and gets the same Excel file: same columns, same file name pattern
// (<unit>_ปีงบ<year>.xlsx). Only access differs by role:
//   Web Master / Central Staff → any unit or all units, full national ID
//   Unit Coordinator            → own unit only (any unit_id sent is ignored), national ID masked
//   anyone else                 → 403
// Body (all optional): unit_id, fy (พ.ศ. or "all"), class_id, learner_ids (the rows a page filtered to).

const SOURCE_LABEL: Record<string, string> = {
  unit_self_entry: "กรอกในระบบ",
  unit_import_file: "นำเข้าจากไฟล์",
};

// Characters Windows/macOS reject in file names.
function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

type ExportBody = { unit_id?: string; fy?: string | number; class_id?: string; learner_ids?: string[] };

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, unit_scope")
    .eq("id", user.id)
    .maybeSingle();

  // §07-import-export-plan.md §4 — role is checked here at the backend, not just hidden in UI.
  const isStaff = profile?.role === "web_master" || profile?.role === "central_staff";
  const isCoordinator = profile?.role === "unit_coordinator" && !!profile.unit_scope;
  if (!isStaff && !isCoordinator) return new Response("forbidden", { status: 403 });

  let body: ExportBody = {};
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    body = {};
  }
  const unitId = isStaff ? body.unit_id || null : profile!.unit_scope!;
  const fyRaw = body.fy == null ? "" : String(body.fy);
  // fiscal_year is already พ.ศ. Missing / "all" = every year.
  const fiscalYear = /^\d{4}$/.test(fyRaw) ? Number(fyRaw) : null;
  const classId = body.class_id || null;
  const onlyIds = Array.isArray(body.learner_ids) ? new Set(body.learner_ids.map(String)) : null;

  // Every learner column (province/district/subdistrict ids are never filled by the app, so they
  // are left out) + each enrollment's class + certification + every standard's result.
  let query = supabase
    .from("learners")
    .select(
      "learner_id, learner_seq, unit_id, first_name, last_name, national_id_encrypted, gender, birth_date, occupation, phone, email, address, source, external_ref, created_at, training_units(name), enrollments(status, applied_at, class_id, certification_records(certified_at, certificate_ref), classes(batch_code, name, fiscal_year, start_date, end_date, courses(name))), assessment_results(standard_type, result, tested_at)",
    );
  if (unitId) query = query.eq("unit_id", unitId);

  const { data: allLearners, error } = await query.order("learner_seq", { ascending: true });
  if (error) return new Response(error.message, { status: 500 });
  const learners = (allLearners ?? []).filter((l) => !onlyIds || onlyIds.has(l.learner_id));

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

  // Standard columns: the ones still in use, plus a retired one only if someone in this file has it.
  const standards: string[] = [...ASSESSMENT_STANDARD_OPTIONS];
  for (const l of learners) {
    for (const a of l.assessment_results ?? []) if (!standards.includes(a.standard_type)) standards.push(a.standard_type);
  }

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
    ...standards.flatMap((s) => [ASSESSMENT_STANDARD_LABEL[s] ?? s, `${ASSESSMENT_STANDARD_LABEL[s] ?? s} — วันที่ทดสอบ`]),
    "ช่องทางบันทึก",
    "รหัสอ้างอิงเดิม",
    "วันที่สร้าง",
  ];

  // One row per learner per class in scope, so รุ่น / ปีงบ / สถานะ each get their own column. With a
  // fiscal year (or class) picked, only those classes count and learners with none are left out;
  // otherwise a learner with no class still gets one row.
  const rows: (string | number | null)[][] = [];
  for (const l of learners) {
    const enrollments = (l.enrollments ?? []).filter(
      (e) => (fiscalYear == null || e.classes?.fiscal_year === fiscalYear) && (!classId || e.class_id === classId),
    );
    if ((fiscalYear != null || classId) && enrollments.length === 0) continue;

    const fullId = decryptNationalId(byteaHexToBuffer(l.national_id_encrypted as unknown as string));
    const nationalId = isStaff ? fullId : maskNationalId(fullId);
    const age = computeAge(l.birth_date);
    const uCode = unitCodeByUnit.get(l.unit_id) ?? null;

    // Per standard: a passed result wins; otherwise the most recently tested one.
    const standardCells = standards.flatMap((s) => {
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
      formatPhone(l.phone),
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

  // Text columns so Excel keeps them verbatim (leading zeros, 13-digit IDs, codes).
  const textColumns = ["รหัสผู้เรียน", "เลขบัตรประชาชน", "เบอร์โทร", "รหัสหน่วยฝึกอบรม", "รหัสรุ่น", "เลขที่วุฒิบัตร", "รหัสอ้างอิงเดิม"].map((h) =>
    headers.indexOf(h),
  );
  const xlsx = await buildXlsxDataSheet(headers, rows, { textColumns, sheetName: "ผู้เรียน" });

  // Service role so the log row is written for every role (a coordinator may have no audit_log
  // INSERT policy, and a missing policy fails silently).
  await createAdminClient().from("audit_log").insert({
    actor_user_id: user.id,
    action: "export_learners",
    entity_type: "learner",
    record_id: unitId ?? "all_units",
    changed_fields: [
      `${rows.length} rows`,
      fiscalYear ? `fy:${fiscalYear}` : "fy:all",
      ...(classId ? [`class:${classId}`] : []),
      ...(onlyIds ? ["filtered"] : []),
      isStaff ? "national_id:full" : "national_id:masked",
    ],
  });

  // File name = unit name + fiscal year, e.g. "วิทยาลัยอาชีวศึกษาชลบุรี_ปีงบ2570.xlsx".
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
