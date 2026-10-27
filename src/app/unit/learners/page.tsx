import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { byteaHexToBuffer, decryptNationalId, maskNationalId } from "@/lib/crypto/national-id";
import { ASSESSMENT_STANDARD_LABEL, ENROLL_STATUS_LABEL, ENROLL_STATUS_PILL } from "@/lib/labels";
import { computeAge } from "@/lib/age";
import { AppShell } from "@/components/layout/AppShell";
import { LearnersTable, type LearnerRow } from "./learners-table";

export default async function UnitLearnersPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  const supabase = await createClient();

  const [{ data: learners }, { data: classes }] = await Promise.all([
    supabase
      .from("learners")
      .select(
        "learner_id, first_name, last_name, birth_date, national_id_encrypted, phone, email, enrollments(status, class_id, classes(batch_code, start_date, courses(name))), assessment_results(standard_type, result)",
      )
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false }),
    supabase
      .from("classes")
      .select("class_id, batch_code, start_date, courses(name)")
      .eq("unit_id", unitId)
      .order("batch_code", { ascending: true }),
  ]);

  const rows: LearnerRow[] = (learners ?? []).map((l) => {
    const nationalId = decryptNationalId(byteaHexToBuffer(l.national_id_encrypted as unknown as string));
    return {
      learner_id: l.learner_id,
      first_name: l.first_name,
      last_name: l.last_name,
      masked_id: maskNationalId(nationalId),
      age: computeAge(l.birth_date),
      phone: l.phone,
      email: l.email,
      enrollments: (l.enrollments ?? []).map((e) => ({
        statusLabel: ENROLL_STATUS_LABEL[e.status] ?? e.status,
        statusPill: ENROLL_STATUS_PILL[e.status] ?? "pending",
        courseLabel: `${e.classes?.batch_code ? e.classes.batch_code + " · " : ""}${e.classes?.courses?.name ?? "—"} (${e.classes?.start_date ?? "—"})`,
        class_id: e.class_id,
        status: e.status,
      })),
      standards: (l.assessment_results ?? [])
        .filter((a) => a.result === "passed")
        .map((a) => ({
          label: ASSESSMENT_STANDARD_LABEL[a.standard_type] ?? a.standard_type,
          pill: "done",
          standard_type: a.standard_type,
        })),
    };
  });

  const classOptions = (classes ?? []).map((c) => ({
    class_id: c.class_id,
    label: `${c.batch_code ? c.batch_code + " · " : ""}${c.courses?.name ?? "—"} (${c.start_date})`,
  }));
  const standardOptions = Object.entries(ASSESSMENT_STANDARD_LABEL).map(([value, label]) => ({ value, label }));

  return (
    <AppShell profile={profile} active="learners" eyebrow="ข้อมูลผู้เรียน" title="ค้นหาและรายงานผู้เรียน">
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <p className="footnote" style={{ marginBottom: 18 }}>
        หน้านี้ใช้ค้นหาและออกรายงานผู้เรียน (สถานะการเรียน ผลการเรียน มาตรฐานที่ได้รับ อายุ) ·
        การเพิ่มผู้เรียนและบันทึกผลทำในแต่ละชั้นเรียนที่เมนู{" "}
        <Link href={`/unit/classes${isStaff ? `?unit_id=${unitId}` : ""}`}>จัดการชั้นเรียน</Link>
      </p>

      <LearnersTable unitId={unitId} learners={rows} classes={classOptions} standards={standardOptions} />
    </AppShell>
  );
}
