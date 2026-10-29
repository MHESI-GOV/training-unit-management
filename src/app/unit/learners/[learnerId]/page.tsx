import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { byteaHexToBuffer, decryptNationalId, maskNationalId } from "@/lib/crypto/national-id";
import { ASSESSMENT_STANDARD_LABEL, ASSESSMENT_RESULT_LABEL } from "@/lib/labels";
import { formatAge } from "@/lib/age";
import { formatThaiDate } from "@/lib/date-format";
import { learnerStatusDisplay } from "@/lib/learner-status";
import { AppShell } from "@/components/layout/AppShell";
import { RevealIdButton } from "../reveal-id-button";

export default async function LearnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ learnerId: string }>;
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { learnerId } = await params;
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  const supabase = await createClient();

  const { data: learner } = await supabase
    .from("learners")
    .select(
      "learner_id, first_name, last_name, birth_date, national_id_encrypted, phone, email, address, enrollments(enrollment_id, status, classes(batch_code, start_date, end_date, courses(name))), assessment_results(result_id, standard_type, result, tested_at)",
    )
    .eq("learner_id", learnerId)
    .eq("unit_id", unitId)
    .maybeSingle();

  if (!learner) notFound();

  const nationalId = decryptNationalId(byteaHexToBuffer(learner.national_id_encrypted as unknown as string));
  const backHref = `/unit/learners${isStaff ? `?unit_id=${unitId}` : ""}`;

  return (
    <AppShell profile={profile} active="learners" eyebrow="ข้อมูลผู้เรียน (รายงาน)" title={`${learner.first_name} ${learner.last_name}`}>
      <p style={{ marginBottom: 18 }}>
        <Link href={backHref}>← กลับไปรายชื่อผู้เรียน</Link>
      </p>

      <p className="footnote" style={{ marginBottom: 18 }}>
        หน้านี้แสดงข้อมูลแบบอ่านอย่างเดียว · การลงรุ่น/บันทึกผลการเรียนทำที่หน้า{" "}
        <Link href={`/unit/classes${isStaff ? `?unit_id=${unitId}` : ""}`}>จัดการชั้นเรียน</Link>
      </p>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>ข้อมูลส่วนตัว</h2>
        <dl className="detail-grid">
          <div><dt>อายุ</dt><dd>{formatAge(learner.birth_date)}</dd></div>
          <div><dt>วันเกิด</dt><dd>{formatThaiDate(learner.birth_date)}</dd></div>
          <div><dt>เบอร์โทร</dt><dd>{learner.phone ?? "—"}</dd></div>
          <div><dt>อีเมล</dt><dd>{learner.email ?? "—"}</dd></div>
          <div style={{ gridColumn: "1 / -1" }}><dt>ที่อยู่</dt><dd>{learner.address ?? "—"}</dd></div>
        </dl>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
          <span className="footnote">เลขบัตรประชาชน: {maskNationalId(nationalId)}</span>
          <RevealIdButton unitId={unitId} learnerId={learner.learner_id} />
        </div>
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>รุ่นฝึกอบรม / สถานะการเรียน</h2>
        {(learner.enrollments ?? []).length === 0 && <p className="footnote">ยังไม่ได้ลงรุ่นฝึกอบรม</p>}
        <div style={{ display: "grid", gap: 8 }}>
          {(learner.enrollments ?? []).map((e) => {
            const ls = learnerStatusDisplay(e.status, e.classes?.end_date ?? null);
            return (
              <div key={e.enrollment_id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className={`pill ${ls.pill}`}>{ls.label}</span>
                <span style={{ fontSize: 14 }}>
                  {e.classes?.batch_code ? `${e.classes.batch_code} · ` : ""}{e.classes?.courses?.name} ({formatThaiDate(e.classes?.start_date)})
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>ผลทดสอบ / คุณวุฒิมาตรฐานที่ได้รับ</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(learner.assessment_results ?? []).map((a) => (
            <span
              key={a.result_id}
              className={`pill ${a.result === "passed" ? "done" : a.result === "failed" ? "fail" : "pending"}`}
            >
              {ASSESSMENT_STANDARD_LABEL[a.standard_type] ?? a.standard_type} — {ASSESSMENT_RESULT_LABEL[a.result] ?? a.result}
              {a.tested_at && ` (${formatThaiDate(a.tested_at)})`}
            </span>
          ))}
          {(learner.assessment_results ?? []).length === 0 && <span className="pill muted">ยังไม่มีข้อมูล</span>}
        </div>
      </section>
    </AppShell>
  );
}
