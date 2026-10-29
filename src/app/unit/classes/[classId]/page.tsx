import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { byteaHexToBuffer, decryptNationalId, maskNationalId } from "@/lib/crypto/national-id";
import { computeAge } from "@/lib/age";
import { fetchUnitCode } from "@/lib/unit-code";
import { studentCode, classCode } from "@/lib/id-codes";
import { CLASS_MODE_LABEL, ASSESSMENT_STANDARD_LABEL } from "@/lib/labels";
import { classStatusDisplay } from "@/lib/class-status";
import { formatThaiDate } from "@/lib/date-format";
import { AppShell } from "@/components/layout/AppShell";
import { ClassHeaderClient } from "./class-header";
import { ClassInstructorsClient, type ClassInstructorRow, type LibraryInstructor } from "./class-instructors";
import { ClassLearnersClient, type ClassLearnerRow } from "./class-learners";
import type { ClassEdit } from "../class-form";

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { classId } = await params;
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  const supabase = await createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select(
      "class_id, batch_code, name, course_id, status, start_date, end_date, schedule_time, seat_count, mode, location, note, lead_instructor_id, courses(name), lead:instructors!classes_lead_instructor_id_fkey(name)",
    )
    .eq("class_id", classId)
    .eq("unit_id", unitId)
    .maybeSingle();

  if (!cls) notFound();

  const [{ data: courses }, { data: library }, { data: ciRows }, { data: enrollments }] = await Promise.all([
    supabase.from("courses").select("course_id, name").order("name"),
    supabase.from("instructors").select("instructor_id, name, phone, email").eq("unit_id", unitId).order("name"),
    supabase
      .from("class_instructors")
      .select("role_in_class, instructors(instructor_id, name, phone, email)")
      .eq("class_id", classId),
    supabase
      .from("enrollments")
      .select(
        "enrollment_id, status, learners!inner(learner_id, first_name, last_name, gender, birth_date, national_id_encrypted, phone, email, address, occupation, learner_seq, assessment_results(result_id, standard_type, result, tested_at))",
      )
      .eq("class_id", classId),
  ]);

  const unitCodeInfo = await fetchUnitCode(supabase, unitId);

  const classInstructors: ClassInstructorRow[] = (ciRows ?? [])
    .filter((r) => r.instructors)
    .map((r) => ({
      instructor_id: r.instructors!.instructor_id,
      name: r.instructors!.name ?? "",
      phone: r.instructors!.phone,
      email: r.instructors!.email,
      role_in_class: r.role_in_class,
      is_lead: r.instructors!.instructor_id === cls.lead_instructor_id,
    }));
  const inClassIds = new Set(classInstructors.map((c) => c.instructor_id));
  const availableLibrary: LibraryInstructor[] = (library ?? [])
    .filter((l) => !inClassIds.has(l.instructor_id))
    .map((l) => ({ instructor_id: l.instructor_id, name: l.name ?? "", phone: l.phone, email: l.email }));
  const libraryForForm = (library ?? []).map((l) => ({ instructor_id: l.instructor_id, name: l.name ?? "" }));

  const learners: ClassLearnerRow[] = (enrollments ?? []).map((e) => {
    const l = e.learners!;
    const nid = decryptNationalId(byteaHexToBuffer(l.national_id_encrypted as unknown as string));
    const results = l.assessment_results ?? [];
    const hasPassed = (std: string) => results.some((a) => a.standard_type === std && a.result === "passed");
    return {
      enrollment_id: e.enrollment_id,
      learner_id: l.learner_id,
      student_code: studentCode(unitCodeInfo.code, l.learner_seq),
      first_name: l.first_name,
      last_name: l.last_name,
      gender: l.gender,
      masked_id: maskNationalId(nid),
      birth_date: l.birth_date,
      age: computeAge(l.birth_date),
      email: l.email,
      address: l.address,
      occupation: l.occupation,
      status: e.status,
      course_pass: e.status === "completed",
      dsd_l1_passed: hasPassed("dsd_l1"),
      food_contact_passed: hasPassed("anamai_food_contact"),
      standards: results.map((a) => ({
        result_id: a.result_id,
        label: ASSESSMENT_STANDARD_LABEL[a.standard_type] ?? a.standard_type,
        result: a.result,
        tested_at: a.tested_at,
      })),
    };
  });

  const editData: ClassEdit = {
    class_id: cls.class_id,
    course_id: cls.course_id,
    name: cls.name,
    start_date: cls.start_date,
    end_date: cls.end_date,
    seat_count: cls.seat_count,
    schedule_time: cls.schedule_time,
    lead_instructor_id: cls.lead_instructor_id,
    mode: cls.mode,
    location: cls.location,
    status: cls.status,
    note: cls.note,
  };

  const classLabel = `${cls.batch_code ?? ""} ${cls.courses?.name ?? ""}`.trim();
  const leadName = (cls.lead as unknown as { name: string } | null)?.name ?? null;
  const backHref = `/unit/classes${isStaff ? `?unit_id=${unitId}` : ""}`;

  return (
    <AppShell profile={profile} active="classes" eyebrow={`ชั้นเรียน ${cls.batch_code ?? ""}`} title={cls.courses?.name ?? "ชั้นเรียน"}>
      <p style={{ marginBottom: 16 }}>
        <Link href={backHref}>← กลับไปรายการชั้นเรียน</Link>
      </p>

      {/* Class info + edit */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="class-row-code">{cls.batch_code ?? "—"}</span>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              {cls.courses?.name}
              {cls.name ? ` · ${cls.name}` : ""}
            </h2>
            {(() => {
              const s = classStatusDisplay(cls.start_date, cls.end_date);
              return <span className={`pill ${s.pill}`}>{s.label}</span>;
            })()}
          </div>
          <ClassHeaderClient unitId={unitId} courses={courses ?? []} library={libraryForForm} edit={editData} />
        </div>
        <dl className="detail-grid">
          <div><dt>รหัสชั้นเรียน</dt><dd style={{ fontVariantNumeric: "tabular-nums" }}>{classCode(unitCodeInfo.code, cls.batch_code) ?? cls.batch_code ?? "—"}</dd></div>
          <div><dt>ช่วงวันที่</dt><dd>{formatThaiDate(cls.start_date)} – {formatThaiDate(cls.end_date)}</dd></div>
          <div><dt>เวลาเรียน</dt><dd>{cls.schedule_time ?? "—"}</dd></div>
          <div><dt>รูปแบบการเรียน</dt><dd>{cls.mode ? CLASS_MODE_LABEL[cls.mode] ?? cls.mode : "—"}</dd></div>
          <div><dt>จำนวนที่รองรับ</dt><dd>{learners.filter((l) => l.status !== "withdrawn").length}/{cls.seat_count} คน <span className="footnote">(ไม่รวมผู้ถอนตัว)</span></dd></div>
          <div><dt>หัวหน้าผู้สอน</dt><dd>{leadName ?? "—"}</dd></div>
          <div><dt>สถานที่/ห้องเรียน</dt><dd>{cls.location ?? "—"}</dd></div>
          <div style={{ gridColumn: "1 / -1" }}><dt>หมายเหตุ</dt><dd>{cls.note ?? "—"}</dd></div>
        </dl>
      </section>

      {/* Instructors */}
      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>ผู้สอนในชั้นเรียนนี้</h2>
        <ClassInstructorsClient
          unitId={unitId}
          classId={classId}
          instructors={classInstructors}
          library={availableLibrary}
        />
      </section>

      {/* Learners + results */}
      <section className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>ผู้เรียนและผลการเรียนในชั้นเรียนนี้</h2>
        <ClassLearnersClient unitId={unitId} classId={classId} classLabel={classLabel} learners={learners} />
      </section>
    </AppShell>
  );
}
