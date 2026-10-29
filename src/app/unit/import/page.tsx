import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { formatThaiDate } from "@/lib/date-format";
import { ImportClient } from "./import-client";
import { LearnerForm } from "../learners/learner-form";

export default async function UnitImportPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string; class_id?: string }>;
}) {
  const { unit_id, class_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("class_id, start_date, courses(name)")
    .eq("unit_id", unitId)
    .order("start_date", { ascending: false });

  const classList = (classes ?? []).map((c) => ({
    class_id: c.class_id,
    label: `${c.courses?.name ?? "—"} (${formatThaiDate(c.start_date)})`,
  }));

  const selected = class_id ? classList.find((c) => c.class_id === class_id) : undefined;
  const qs = (cid: string) => `?${isStaff ? `unit_id=${unitId}&` : ""}class_id=${cid}`;
  const backToClasses = `/unit/classes${isStaff ? `?unit_id=${unitId}` : ""}`;

  return (
    <AppShell profile={profile} active="import" eyebrow="บันทึกผู้เรียนลงรุ่น" title="บันทึกผู้เรียนลงรุ่นฝึกอบรม">
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}

      {/* Step 1: no class chosen yet — the learner must be recorded into a class, so pick one first. */}
      {!selected ? (
        <section className="card" style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>เลือกรุ่นฝึกอบรมที่จะบันทึกผู้เรียนลงไป</h2>
          <p className="footnote" style={{ marginBottom: 14 }}>
            การบันทึกผู้เรียนจะผูกกับรุ่นฝึกอบรมเสมอ — เลือกรุ่นก่อน แล้วจึงเพิ่มทีละคนหรือนำเข้าจากไฟล์ CSV
          </p>
          {classList.length === 0 ? (
            <p className="notice">
              ยังไม่มีรุ่นฝึกอบรม — <Link href={backToClasses}>สร้างรุ่นฝึกอบรมก่อน</Link>
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {classList.map((c) => (
                <Link key={c.class_id} href={`/unit/import${qs(c.class_id)}`} className="btn secondary" style={{ justifyContent: "flex-start" }}>
                  {c.label}
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <p style={{ marginBottom: 18 }}>
            กำลังบันทึกผู้เรียนลงรุ่น: <strong>{selected.label}</strong>{" "}
            <Link href={`/unit/import${isStaff ? `?unit_id=${unitId}` : ""}`} className="footnote">
              (เปลี่ยนรุ่น)
            </Link>
          </p>

          <section className="card" style={{ marginBottom: 24, maxWidth: 560 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>เพิ่มผู้เรียนทีละคน</h2>
            <div style={{ marginTop: 14 }}>
              <LearnerForm unitId={unitId} classId={selected.class_id} />
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>หรือนำเข้าหลายคนจากไฟล์ CSV</h2>
            <ImportClient unitId={unitId} classId={selected.class_id} classLabel={selected.label} />
          </section>
        </>
      )}
    </AppShell>
  );
}
