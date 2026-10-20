import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { byteaHexToBuffer, decryptNationalId, maskNationalId } from "@/lib/crypto/national-id";
import { ASSESSMENT_STANDARD_LABEL, ASSESSMENT_RESULT_LABEL } from "@/lib/labels";
import { AppShell } from "@/components/layout/AppShell";
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

const STATUS_PILL: Record<string, string> = {
  applied: "pending",
  attending: "study",
  completed: "done",
  failed: "fail",
};

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
    <AppShell profile={profile} active="learners" eyebrow="ข้อมูลผู้เรียน" title="ผู้เรียนของหน่วย">
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <p style={{ marginBottom: 20 }}>
        <Link href={`/unit/import-assessments?unit_id=${unitId}`} className="btn secondary">
          นำเข้าผลทดสอบมาตรฐานจากไฟล์ CSV
        </Link>
      </p>

      <section className="card" style={{ marginBottom: 24, maxWidth: 480 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>เพิ่มผู้เรียนใหม่</h2>
        <div style={{ marginTop: 14 }}>
          <LearnerForm unitId={unitId} />
        </div>
      </section>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>รายชื่อผู้เรียน</h2>
      {(learners ?? []).length === 0 && <p className="footnote">ยังไม่มีผู้เรียน</p>}

      <div style={{ display: "grid", gap: 14 }}>
        {(learners ?? []).map((l) => {
          const nationalId = decryptNationalId(byteaHexToBuffer(l.national_id_encrypted as unknown as string));
          return (
            <article key={l.learner_id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <strong>
                    {l.first_name} {l.last_name}
                  </strong>
                  <p className="footnote" style={{ marginTop: 2 }}>
                    เลขบัตร {maskNationalId(nationalId)} {l.phone && `· ${l.phone}`} {l.email && `· ${l.email}`}
                  </p>
                </div>
                <RevealIdButton unitId={unitId} learnerId={l.learner_id} />
              </div>

              <div style={{ marginTop: 14 }}>
                {l.enrollments.map((e) => (
                  <div
                    key={e.enrollment_id}
                    style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}
                  >
                    <span className={`pill ${STATUS_PILL[e.status] ?? "pending"}`}>
                      {STATUS_LABEL[e.status] ?? e.status}
                    </span>
                    <span style={{ fontSize: 14 }}>
                      {e.classes?.courses?.name} ({e.classes?.start_date})
                    </span>
                    {(e.status === "applied" || e.status === "attending") && (
                      <>
                        <form action={markEnrollmentOutcome.bind(null, unitId, e.enrollment_id, "completed")}>
                          <button type="submit" className="btn secondary" style={{ padding: "4px 10px", fontSize: 13 }}>
                            สำเร็จ
                          </button>
                        </form>
                        <form action={markEnrollmentOutcome.bind(null, unitId, e.enrollment_id, "failed")}>
                          <button type="submit" className="btn secondary" style={{ padding: "4px 10px", fontSize: 13 }}>
                            ไม่สำเร็จ
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                ))}
                <EnrollForm unitId={unitId} learnerId={l.learner_id} classes={classOptions} />
              </div>

              <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <p className="footnote" style={{ marginBottom: 6 }}>
                  ผลทดสอบ/คุณวุฒิมาตรฐาน
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {l.assessment_results.map((a) => (
                    <span key={a.result_id} className={`pill ${a.result === "passed" ? "done" : a.result === "failed" ? "fail" : "pending"}`}>
                      {ASSESSMENT_STANDARD_LABEL[a.standard_type] ?? a.standard_type} —{" "}
                      {ASSESSMENT_RESULT_LABEL[a.result] ?? a.result}
                      {a.tested_at && ` (${a.tested_at})`}
                    </span>
                  ))}
                  {l.assessment_results.length === 0 && <span className="pill muted">ยังไม่มีข้อมูล</span>}
                </div>
                <AssessmentForm unitId={unitId} learnerId={l.learner_id} />
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
