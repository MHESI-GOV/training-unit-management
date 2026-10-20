import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { byteaHexToBuffer, decryptNationalId, maskNationalId } from "@/lib/crypto/national-id";
import { ASSESSMENT_STANDARD_LABEL, ASSESSMENT_RESULT_LABEL } from "@/lib/labels";
import { LearnerForm } from "./learner-form";
import { EnrollForm } from "./enroll-form";
import { AssessmentForm } from "./assessment-form";
import { RevealIdButton } from "./reveal-id-button";
import { markEnrollmentOutcome } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  applied: "สมัคร",
  attending: "เข้าร่วม",
  completed: "สำเร็จ",
  failed: "ไม่สำเร็จ",
};

export default async function UnitLearnersPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff } = await resolvePageUnit(unit_id);

  const supabase = await createClient();

  const [{ data: learners }, { data: classes }] = await Promise.all([
    supabase
      .from("learners")
      .select(
        "learner_id, first_name, last_name, national_id_encrypted, phone, email, enrollments(enrollment_id, status, classes(start_date, courses(name))), assessment_results(result_id, standard_type, result, tested_at)",
      )
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false }),
    supabase
      .from("classes")
      .select("class_id, start_date, courses(name)")
      .eq("unit_id", unitId)
      .order("start_date", { ascending: false }),
  ]);

  const classOptions = (classes ?? []).map((c) => ({
    class_id: c.class_id,
    label: `${c.courses?.name} (${c.start_date})`,
  }));

  return (
    <main style={{ maxWidth: 720, margin: "3rem auto", fontFamily: "system-ui" }}>
      {isStaff && (
        <p>
          <Link href="/admin/units">กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <h1>ผู้เรียนของหน่วย</h1>
      <p>
        <Link href={`/unit/import-assessments?unit_id=${unitId}`}>นำเข้าผลทดสอบมาตรฐานจากไฟล์ CSV</Link>
      </p>

      <h2>เพิ่มผู้เรียนใหม่</h2>
      <LearnerForm unitId={unitId} />

      <h2 style={{ marginTop: 32 }}>รายชื่อผู้เรียน</h2>
      {(learners ?? []).length === 0 && <p>ยังไม่มีผู้เรียน</p>}
      {(learners ?? []).map((l) => {
        const nationalId = decryptNationalId(byteaHexToBuffer(l.national_id_encrypted as unknown as string));
        return (
          <div key={l.learner_id} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 16 }}>
            <p>
              <strong>
                {l.first_name} {l.last_name}
              </strong>{" "}
              — เลขบัตร {maskNationalId(nationalId)} — {l.phone} {l.email}
            </p>
            <p>
              <RevealIdButton unitId={unitId} learnerId={l.learner_id} />
            </p>
            <ul>
              {l.enrollments.map((e) => (
                <li key={e.enrollment_id}>
                  {e.classes?.courses?.name} ({e.classes?.start_date}) — สถานะ:{" "}
                  {STATUS_LABEL[e.status] ?? e.status}
                  {(e.status === "applied" || e.status === "attending") && (
                    <>
                      {" "}
                      <form
                        action={markEnrollmentOutcome.bind(null, unitId, e.enrollment_id, "completed")}
                        style={{ display: "inline" }}
                      >
                        <button type="submit">สำเร็จ</button>
                      </form>{" "}
                      <form
                        action={markEnrollmentOutcome.bind(null, unitId, e.enrollment_id, "failed")}
                        style={{ display: "inline" }}
                      >
                        <button type="submit">ไม่สำเร็จ</button>
                      </form>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <EnrollForm unitId={unitId} learnerId={l.learner_id} classes={classOptions} />

            <p style={{ marginTop: 12, marginBottom: 4 }}>ผลทดสอบ/คุณวุฒิมาตรฐาน:</p>
            <ul>
              {l.assessment_results.map((a) => (
                <li key={a.result_id}>
                  {ASSESSMENT_STANDARD_LABEL[a.standard_type] ?? a.standard_type} —{" "}
                  {ASSESSMENT_RESULT_LABEL[a.result] ?? a.result}
                  {a.tested_at && ` (${a.tested_at})`}
                </li>
              ))}
              {l.assessment_results.length === 0 && <li>ยังไม่มีข้อมูล</li>}
            </ul>
            <AssessmentForm unitId={unitId} learnerId={l.learner_id} />
          </div>
        );
      })}
    </main>
  );
}
