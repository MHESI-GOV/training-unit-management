import { createClient } from "@/lib/supabase/server";
import { ASSESSMENT_STANDARD_LABEL, GENDER_LABEL } from "@/lib/labels";
import { computeAge } from "@/lib/age";
import { formatThaiDate } from "@/lib/date-format";
import { computeLearnerStatus, learnerStatusDisplay } from "@/lib/learner-status";
import type { LearnerRow } from "./learners-table";

export type UnitLearnersData = {
  rows: LearnerRow[];
  classOptions: { class_id: string; label: string }[];
  standardOptions: { value: string; label: string }[];
  fiscalYearOptions: number[];
};

// Loads a unit's learner list + the filter options for the ผู้เรียน table. Shared by the Unit
// Coordinator page (/unit/learners) and the staff unit-sheet tab (/admin/units/[unitId]/learners)
// so the row shape / fields stay in one place. RLS (via the session client) scopes access; national
// IDs are never decrypted here (the table shows a reveal button only).
export async function loadUnitLearners(unitId: string): Promise<UnitLearnersData> {
  const supabase = await createClient();

  const [{ data: learners }, { data: classes }] = await Promise.all([
    supabase
      .from("learners")
      .select(
        "learner_id, first_name, last_name, gender, occupation, birth_date, phone, email, enrollments(status, class_id, classes(batch_code, start_date, end_date, fiscal_year, courses(name))), assessment_results(standard_type, result)",
      )
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false }),
    supabase
      .from("classes")
      .select("class_id, batch_code, start_date, fiscal_year, courses(name)")
      .eq("unit_id", unitId)
      .order("batch_code", { ascending: true }),
  ]);

  const rows: LearnerRow[] = (learners ?? []).map((l) => ({
    learner_id: l.learner_id,
    first_name: l.first_name,
    last_name: l.last_name,
    gender: l.gender ? GENDER_LABEL[l.gender] ?? l.gender : "",
    occupation: l.occupation ?? "",
    age: computeAge(l.birth_date),
    phone: l.phone,
    email: l.email,
    enrollments: (l.enrollments ?? []).map((e) => {
      const endDate = e.classes?.end_date ?? null;
      const ls = learnerStatusDisplay(e.status, endDate);
      return {
        statusLabel: ls.label,
        statusPill: ls.pill,
        courseLabel: `${e.classes?.batch_code ? e.classes.batch_code + " · " : ""}${e.classes?.courses?.name ?? "—"} (${formatThaiDate(e.classes?.start_date)})`,
        class_id: e.class_id,
        fiscalYear: e.classes?.fiscal_year ?? null,
        status: computeLearnerStatus(e.status, endDate),
      };
    }),
    standards: (l.assessment_results ?? [])
      .filter((a) => a.result === "passed")
      .map((a) => ({
        label: ASSESSMENT_STANDARD_LABEL[a.standard_type] ?? a.standard_type,
        pill: "done",
        standard_type: a.standard_type,
      })),
  }));

  const classOptions = (classes ?? []).map((c) => ({
    class_id: c.class_id,
    label: `${c.batch_code ? c.batch_code + " · " : ""}${c.courses?.name ?? "—"} (${formatThaiDate(c.start_date)})`,
  }));
  const standardOptions = Object.entries(ASSESSMENT_STANDARD_LABEL).map(([value, label]) => ({ value, label }));
  const fiscalYearOptions = Array.from(
    new Set((classes ?? []).map((c) => c.fiscal_year).filter((y): y is number => y != null)),
  ).sort((a, b) => b - a);

  return { rows, classOptions, standardOptions, fiscalYearOptions };
}

// ── All-units learner database (Web Master / Central Staff) ──────────────────────────────────────
export type AllLearnerRow = LearnerRow & { unit_id: string; unit_name: string };
export type AllLearnersData = {
  rows: AllLearnerRow[];
  units: { unit_id: string; name: string }[];
  standardOptions: { value: string; label: string }[];
  fiscalYearOptions: number[];
};

// Loads EVERY unit's learners into one cross-unit list (for the "ฐานข้อมูลผู้เรียนทุกหน่วย" page).
// RLS lets web_master/central_staff read all units; a coordinator would get only their own (but the
// page itself is staff-gated). National IDs are not decrypted here (reveal-on-demand only).
export async function loadAllLearners(): Promise<AllLearnersData> {
  const supabase = await createClient();

  const [{ data: learners }, { data: units }, { data: fyRows }] = await Promise.all([
    supabase
      .from("learners")
      .select(
        "learner_id, first_name, last_name, gender, occupation, birth_date, phone, email, unit_id, training_units(name), enrollments(status, class_id, classes(batch_code, start_date, end_date, fiscal_year, courses(name))), assessment_results(standard_type, result)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("training_units").select("unit_id, name").order("name"),
    supabase.from("classes").select("fiscal_year"),
  ]);

  const rows: AllLearnerRow[] = (learners ?? []).map((l) => ({
    learner_id: l.learner_id,
    first_name: l.first_name,
    last_name: l.last_name,
    gender: l.gender ? GENDER_LABEL[l.gender] ?? l.gender : "",
    occupation: l.occupation ?? "",
    age: computeAge(l.birth_date),
    phone: l.phone,
    email: l.email,
    unit_id: l.unit_id,
    unit_name: l.training_units?.name ?? "—",
    enrollments: (l.enrollments ?? []).map((e) => {
      const endDate = e.classes?.end_date ?? null;
      const ls = learnerStatusDisplay(e.status, endDate);
      return {
        statusLabel: ls.label,
        statusPill: ls.pill,
        courseLabel: `${e.classes?.batch_code ? e.classes.batch_code + " · " : ""}${e.classes?.courses?.name ?? "—"} (${formatThaiDate(e.classes?.start_date)})`,
        class_id: e.class_id,
        fiscalYear: e.classes?.fiscal_year ?? null,
        status: computeLearnerStatus(e.status, endDate),
      };
    }),
    standards: (l.assessment_results ?? [])
      .filter((a) => a.result === "passed")
      .map((a) => ({
        label: ASSESSMENT_STANDARD_LABEL[a.standard_type] ?? a.standard_type,
        pill: "done",
        standard_type: a.standard_type,
      })),
  }));

  const standardOptions = Object.entries(ASSESSMENT_STANDARD_LABEL).map(([value, label]) => ({ value, label }));
  const fiscalYearOptions = Array.from(
    new Set((fyRows ?? []).map((c) => c.fiscal_year).filter((y): y is number => y != null)),
  ).sort((a, b) => b - a);

  return { rows, units: units ?? [], standardOptions, fiscalYearOptions };
}
