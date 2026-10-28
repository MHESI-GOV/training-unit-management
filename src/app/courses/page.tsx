import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { programCode } from "@/lib/id-codes";
import { AppShell } from "@/components/layout/AppShell";
import { CourseForm } from "./course-form";

const CAN_EDIT = ["web_master", "central_staff", "unit_coordinator"];

export default async function CoursesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("course_id, name, total_hours, theory_hours, practical_hours, description, course_seq")
    .order("course_seq");

  return (
    <AppShell profile={profile} active="courses" eyebrow="หลักสูตรที่ใช้ร่วมกันทุกหน่วย" title="หลักสูตร">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>รหัสหลักสูตร</th>
              <th>ชื่อหลักสูตร</th>
              <th>ชั่วโมงรวม</th>
              <th>ทฤษฎี / ปฏิบัติ</th>
            </tr>
          </thead>
          <tbody>
            {(courses ?? []).map((c) => (
              <tr key={c.course_id}>
                <td style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{programCode(c.course_seq) ?? "—"}</td>
                <td>{c.name}</td>
                <td>{c.total_hours} ชม.</td>
                <td>
                  {c.theory_hours != null && c.practical_hours != null
                    ? `${c.theory_hours} / ${c.practical_hours}`
                    : "—"}
                </td>
              </tr>
            ))}
            {(courses ?? []).length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)" }}>
                  ยังไม่มีหลักสูตร
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {CAN_EDIT.includes(profile.role) && (
        <section className="card" style={{ marginTop: 20, maxWidth: 440 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>เพิ่มหลักสูตรใหม่</h2>
          <div style={{ marginTop: 14 }}>
            <CourseForm />
          </div>
        </section>
      )}
    </AppShell>
  );
}
