import { createClient } from "@/lib/supabase/server";

type Assignment = { course: string; role: string };
type InstructorRow = { id: string; name: string; phone: string | null; email: string | null; assignments: Assignment[] };

export default async function UnitSheetInstructors({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select(
      "courses(name), class_instructors(role_in_class, instructors(instructor_id, name, phone, email))",
    )
    .eq("unit_id", unitId);

  // Flatten class → instructor into a distinct roster, collecting each instructor's assignments.
  const byId = new Map<string, InstructorRow>();
  for (const cls of classes ?? []) {
    for (const ci of cls.class_instructors ?? []) {
      const ins = ci.instructors;
      if (!ins) continue;
      const iid = ins.instructor_id ?? "";
      let row = byId.get(iid);
      if (!row) {
        row = { id: iid, name: ins.name ?? "—", phone: ins.phone, email: ins.email, assignments: [] };
        byId.set(iid, row);
      }
      row.assignments.push({ course: cls.courses?.name ?? "—", role: ci.role_in_class ?? "—" });
    }
  }
  const instructors = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "th"));

  return (
    <>
      <p className="footnote" style={{ marginBottom: 16 }}>
        รายชื่อผู้สอน/วิทยากรทั้งหมดของหน่วยนี้ (รวมจากทุกรุ่นฝึกอบรม) — เพิ่ม/แก้ไขผู้สอนได้จากแท็บ “รุ่นฝึกอบรม”
      </p>

      {instructors.length === 0 ? (
        <p className="footnote">ยังไม่มีผู้สอนในหน่วยนี้</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อผู้สอน</th>
                <th>เบอร์โทร</th>
                <th>อีเมล</th>
                <th>สอนในรุ่น</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((ins) => (
                <tr key={ins.id}>
                  <td>{ins.name}</td>
                  <td>{ins.phone ?? "—"}</td>
                  <td>{ins.email ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {ins.assignments.map((a, i) => (
                        <span key={i} className="pill study">
                          {a.course} ({a.role})
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
