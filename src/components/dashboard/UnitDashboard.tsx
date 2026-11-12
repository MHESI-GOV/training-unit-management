import type { SupabaseClient } from "@supabase/supabase-js";
import { Users, BookOpenCheck, GraduationCap, Award, ShieldCheck, Medal, BadgeCheck } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";
import { unitCode } from "@/lib/id-codes";
import { computeClassStatus, CLASS_STATUS_DISPLAY, type ClassStatusCode } from "@/lib/class-status";
import { formatThaiDate } from "@/lib/date-format";
import {
  ASSESSMENT_STANDARD_LABEL,
  PARTICIPATION_STATUS_LABEL,
  REGION_LABEL,
  ROUND_STATUS_LABEL,
  UNIT_TYPE_LABEL,
} from "@/lib/labels";

// Dashboard for ONE training unit (the "แดชบอร์ด" tab of /admin/units/[unitId] and a coordinator's
// home). Unlike the project-wide OverviewCards it shows unit-level facts: learner / class / instructor
// counts, how many learners hold each standard, participation per fiscal year, and the unit's general
// info. Reads through the caller's session, so RLS limits a coordinator to their own unit.

type Client = SupabaseClient<Database>;
const PAGE = 1000;

// PostgREST caps a response at 1000 rows; page through so large units still count correctly.
async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await query(from, from + PAGE - 1);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

// Standards shown on the dashboard, in a fixed order. The retired anamai_food_handler and "other"
// only appear when a learner of this unit actually holds them.
const STANDARD_CARDS: { key: string; title: string; agency: string; icon: React.ReactNode; bg: string; color: string }[] = [
  { key: "anamai_food_contact", title: "ผ่านการอบรมผู้สัมผัสอาหาร", agency: "กรมอนามัย", icon: <ShieldCheck size={20} />, bg: "#e2f3e9", color: "#1baf7a" },
  { key: "professional_qualification", title: "ประกาศนียบัตรสมรรถนะผู้ประกอบอาหารไทย ระดับ 4", agency: "สถาบันคุณวุฒิวิชาชีพ (องค์การมหาชน)", icon: <Award size={20} />, bg: "#fbe6f0", color: "#d55181" },
  { key: "dsd_l1", title: "มาตรฐานฝีมือแรงงานแห่งชาติ ผู้ประกอบอาหารไทย ระดับ 1", agency: "กรมพัฒนาฝีมือแรงงาน", icon: <Medal size={20} />, bg: "#fdf0de", color: "#c98500" },
  { key: "anamai_food_handler", title: ASSESSMENT_STANDARD_LABEL.anamai_food_handler, agency: "กรมอนามัย (เลิกใช้แล้ว)", icon: <ShieldCheck size={20} />, bg: "#eef0f3", color: "#6b7280" },
  { key: "other", title: "มาตรฐานอื่นๆ", agency: "อื่นๆ", icon: <BadgeCheck size={20} />, bg: "#eef0f3", color: "#6b7280" },
];
const OPTIONAL_STANDARDS = new Set(["anamai_food_handler", "other"]);

export async function UnitDashboard({ supabase, unitId }: { supabase: Client; unitId: string }) {
  const [unitRes, profileRes, learnerCountRes, instructorsRes, classesRes, passed, enrollments, partRes] = await Promise.all([
    supabase.from("training_units").select("name, region, type, status, unit_seq, created_at").eq("unit_id", unitId).maybeSingle(),
    supabase.from("training_unit_profiles").select("*").eq("unit_id", unitId).maybeSingle(),
    supabase.from("learners").select("learner_id", { count: "exact", head: true }).eq("unit_id", unitId),
    supabase.from("instructors").select("passed_ttt, tester_status").eq("unit_id", unitId),
    supabase.from("classes").select("class_id, fiscal_year, start_date, end_date").eq("unit_id", unitId),
    fetchAll<{ learner_id: string; standard_type: string }>((from, to) =>
      supabase
        .from("assessment_results")
        .select("learner_id, standard_type, learners!inner(unit_id)")
        .eq("learners.unit_id", unitId)
        .eq("result", "passed")
        .order("result_id")
        .range(from, to),
    ),
    fetchAll<{ learner_id: string; status: string; classes: { fiscal_year: number | null } | null }>((from, to) =>
      supabase
        .from("enrollments")
        .select("learner_id, status, classes!inner(fiscal_year, unit_id)")
        .eq("classes.unit_id", unitId)
        .order("enrollment_id")
        .range(from, to),
    ),
    supabase
      .from("unit_participation")
      .select("fiscal_year, status, responded_at, participation_rounds(status, deadline)")
      .eq("unit_id", unitId)
      .order("fiscal_year", { ascending: false }),
  ]);

  const unit = unitRes.data;
  if (!unit) return <p className="footnote">ไม่พบข้อมูลหน่วยฝึกอบรม</p>;
  const profile = profileRes.data;

  // 1. Learners
  const totalLearners = learnerCountRes.count ?? 0;

  // 2. Standards: distinct learners who passed each standard
  const holders = new Map<string, Set<string>>();
  for (const r of passed) {
    if (!holders.has(r.standard_type)) holders.set(r.standard_type, new Set());
    holders.get(r.standard_type)!.add(r.learner_id);
  }
  const standardCards = STANDARD_CARDS.filter((s) => !OPTIONAL_STANDARDS.has(s.key) || (holders.get(s.key)?.size ?? 0) > 0);

  // 3. Classes by derived status
  const classes = classesRes.data ?? [];
  const classByStatus: Record<ClassStatusCode, number> = { open: 0, ongoing: 0, completed: 0 };
  for (const c of classes) classByStatus[computeClassStatus(c.start_date, c.end_date)]++;

  // 4. Instructors
  const instructors = instructorsRes.data ?? [];
  const ttt = instructors.filter((i) => i.passed_ttt).length;
  const testers = instructors.filter((i) => i.tester_status && i.tester_status !== "none").length;

  // 5. Participation per fiscal year, plus classes / learners bound to that year
  const classesByYear = new Map<number, number>();
  for (const c of classes) if (c.fiscal_year) classesByYear.set(c.fiscal_year, (classesByYear.get(c.fiscal_year) ?? 0) + 1);
  const learnersByYear = new Map<number, Set<string>>();
  for (const e of enrollments) {
    const fy = e.classes?.fiscal_year;
    if (!fy) continue;
    if (!learnersByYear.has(fy)) learnersByYear.set(fy, new Set());
    learnersByYear.get(fy)!.add(e.learner_id);
  }
  type PartRow = { fiscal_year: number; status: string; responded_at: string | null; participation_rounds: { status: string; deadline: string | null } | null };
  const partRows = (partRes.data ?? []) as PartRow[];
  const partByYear = new Map(partRows.map((p) => [p.fiscal_year, p]));
  const years = [...new Set([...partByYear.keys(), ...classesByYear.keys()])].sort((a, b) => b - a);

  // 6. General info
  const code = unitCode({ region: unit.region, provinceName: profile?.province_name ?? null, unitSeq: unit.unit_seq });
  // Prefix a part unless the stored value already carries it (e.g. road "ถนนมหาวิทยาลัย").
  const pre = (prefix: string, v: string | null | undefined, already: RegExp) =>
    !v ? null : already.test(v) ? v : `${prefix}${v}`;
  const address = [
    profile?.house_no,
    pre("ถ.", profile?.road, /^(ถ\.|ถนน)/),
    pre("ต.", profile?.subdistrict_name, /^(ต\.|ตำบล|แขวง)/),
    pre("อ.", profile?.district_name, /^(อ\.|อำเภอ|เขต)/),
    pre("จ.", profile?.province_name, /^(จ\.|จังหวัด|กรุงเทพ)/),
  ].filter(Boolean).join(" ") || profile?.address || null;
  const coordinator =
    [profile?.coordinator_first_name, profile?.coordinator_last_name].filter(Boolean).join(" ") || profile?.coordinator_name || null;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* แถว 1: ผู้เรียน / คลาส / วิทยากร */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard label="จำนวนผู้เรียนในหน่วยฝึก" value={totalLearners} unit="คน" icon={<Users size={22} />} bg="#e5f0fc" color="#2a78d6"
          note="ผู้เรียนทั้งหมดที่มีข้อมูลในระบบของหน่วยนี้" />
        <StatCard label="จำนวนคลาส (รุ่นฝึกอบรม)" value={classes.length} unit="รุ่น" icon={<BookOpenCheck size={22} />} bg="#ede6fb" color="#4a3aa7">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {(Object.keys(CLASS_STATUS_DISPLAY) as ClassStatusCode[]).map((k) => (
              <span key={k} className={`pill ${CLASS_STATUS_DISPLAY[k].pill}`}>
                {CLASS_STATUS_DISPLAY[k].label} {classByStatus[k].toLocaleString("th-TH")}
              </span>
            ))}
          </div>
        </StatCard>
        <StatCard label="จำนวนวิทยากร" value={instructors.length} unit="คน" icon={<GraduationCap size={22} />} bg="#e2f3e9" color="#1baf7a"
          note={`ผ่าน TTT ${ttt.toLocaleString("th-TH")} คน · เป็นผู้ทดสอบฯ ${testers.toLocaleString("th-TH")} คน`} />
      </div>

      {/* แถว 2: มาตรฐานที่ผู้เรียนได้รับ */}
      <section className="card">
        <div className="stat-label" style={{ fontWeight: 600 }}>มาตรฐานที่ผู้เรียนได้รับ (จำนวนผู้เรียนที่ผ่าน แยกตามมาตรฐาน)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
          {standardCards.map((s) => {
            const n = holders.get(s.key)?.size ?? 0;
            const pct = totalLearners > 0 ? Math.round((n / totalLearners) * 100) : 0;
            return (
              <div key={s.key} style={{ border: "1px solid var(--line, #e5e7eb)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column" }}>
                <IconBadge icon={s.icon} bg={s.bg} color={s.color} size={38} />
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>{s.title}</div>
                <div className="stat-note" style={{ marginTop: 2 }}>{s.agency}</div>
                <div style={{ marginTop: "auto", paddingTop: 10 }}>
                  <span style={{ fontSize: 26, fontWeight: 700 }}>{n.toLocaleString("th-TH")}</span>
                  <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 6 }}>คน</span>
                  {totalLearners > 0 && <span className="footnote" style={{ marginLeft: 8 }}>({pct}% ของผู้เรียน)</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* แถว 3: สถานะการเข้าร่วมรายปีงบ + ข้อมูลทั่วไป */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "stretch" }}>
        <section className="card" style={{ flex: "1 1 420px", minWidth: 0 }}>
          <div className="stat-label" style={{ fontWeight: 600, marginBottom: 12 }}>สถานะการเข้าร่วมในแต่ละปีงบประมาณ</div>
          {years.length === 0 ? (
            <p className="footnote">ยังไม่มีข้อมูลการเข้าร่วม</p>
          ) : (
            <div className="table-wrap">
              <table style={{ minWidth: 380 }}>
                <thead>
                  <tr>
                    <th>ปีงบประมาณ</th>
                    <th>สถานะการเข้าร่วม</th>
                    <th style={{ textAlign: "right" }}>คลาส</th>
                    <th style={{ textAlign: "right" }}>ผู้เรียน</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => {
                    const p = partByYear.get(y);
                    const pill = p?.status === "confirmed" ? "done" : p?.status === "declined" ? "fail" : p ? "pending" : "muted";
                    return (
                      <tr key={y}>
                        <td><strong>{y}</strong></td>
                        <td>
                          <span className={`pill ${pill}`}>{p ? PARTICIPATION_STATUS_LABEL[p.status] ?? p.status : "ไม่มีบันทึก"}</span>
                          <div className="footnote" style={{ marginTop: 2 }}>
                            {[
                              p?.responded_at ? `ตอบเมื่อ ${formatThaiDate(p.responded_at)}` : null,
                              p?.participation_rounds ? `รอบ${ROUND_STATUS_LABEL[p.participation_rounds.status] ?? p.participation_rounds.status}` : null,
                            ].filter(Boolean).join(" · ")}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>{(classesByYear.get(y) ?? 0).toLocaleString("th-TH")}</td>
                        <td style={{ textAlign: "right" }}>{(learnersByYear.get(y)?.size ?? 0).toLocaleString("th-TH")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card" style={{ flex: "1 1 380px", minWidth: 0 }}>
          <div className="stat-label" style={{ fontWeight: 600, marginBottom: 12 }}>ข้อมูลทั่วไปของหน่วยฝึก</div>
          <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 14px", margin: 0, fontSize: 14 }}>
            <Info label="ชื่อหน่วยฝึก" value={unit.name} />
            <Info label="รหัสหน่วย" value={code} />
            <Info label="ประเภทสถาบัน" value={UNIT_TYPE_LABEL[unit.type] ?? unit.type} />
            <Info label="ภูมิภาค" value={REGION_LABEL[unit.region] ?? unit.region} />
            <Info label="ที่อยู่" value={address} />
            <Info label="ผู้ประสานงาน" value={coordinator} />
            <Info label="โทรศัพท์" value={profile?.phone} />
            <Info label="อีเมล" value={profile?.email} />
            <Info
              label="ศูนย์ทดสอบฯ สาขาอาหาร"
              value={profile?.is_food_testing_center == null ? null : profile.is_food_testing_center ? "เป็นศูนย์ทดสอบ" : "ไม่เป็นศูนย์ทดสอบ"}
            />
            <Info label="สถานะหน่วย" value={unit.status === "active" ? "ใช้งาน" : "ไม่ใช้งาน"} />
            <Info label="ลงทะเบียนเมื่อ" value={formatThaiDate(unit.created_at)} />
          </dl>
          {profile?.description && (
            <p className="footnote" style={{ marginTop: 12, whiteSpace: "pre-line" }}>{profile.description}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function IconBadge({ icon, bg, color, size = 44 }: { icon: React.ReactNode; bg: string; color: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {icon}
    </div>
  );
}

function StatCard({
  label, value, unit, icon, bg, color, note, children,
}: {
  label: string; value: number; unit: string; icon: React.ReactNode; bg: string; color: string; note?: string; children?: React.ReactNode;
}) {
  return (
    <section className="card" style={{ flex: "1 1 240px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <IconBadge icon={icon} bg={bg} color={color} />
        <div>
          <div className="stat-label">{label}</div>
          <div style={{ marginTop: 2 }}>
            <span style={{ fontSize: 30, fontWeight: 700, color: "var(--ink)" }}>{value.toLocaleString("th-TH")}</span>
            <span style={{ fontSize: 14, color: "var(--muted)", marginLeft: 6 }}>{unit}</span>
          </div>
        </div>
      </div>
      {note && <div className="stat-note" style={{ marginTop: 10 }}>{note}</div>}
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt style={{ color: "var(--muted)" }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 500, overflowWrap: "anywhere" }}>{value || "—"}</dd>
    </>
  );
}
