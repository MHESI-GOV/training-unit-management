"use server";

import { revalidatePath } from "next/cache";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { getUnitConfirmedRounds, type ConfirmedRound } from "@/lib/participation";
import type { SupabaseClient } from "@supabase/supabase-js";

// Resolve which confirmed fiscal year a new class binds to: the one the form picked (must be a year
// the unit confirmed), else the latest confirmed year. Returns null when the unit has confirmed none.
function resolveTargetRound(confirmed: ConfirmedRound[], requestedFy: number | null): ConfirmedRound | null {
  if (confirmed.length === 0) return null;
  if (requestedFy != null) return confirmed.find((r) => r.fiscal_year === requestedFy) ?? null;
  return confirmed[0]; // newest first
}

const NO_CONFIRMED_ROUND_ERROR =
  "หน่วยนี้ยังไม่ได้ยืนยันเข้าร่วมปีงบประมาณใด — ต้องรอ Web Master เปิดรอบและกดยืนยันการเข้าร่วมก่อนจึงจะสร้างชั้นเรียนได้";

export type ClassFormState = { error?: string; success?: string };

const MODES = new Set(["onsite", "online", "hybrid"]);
const STATUSES = new Set(["planned", "open", "ongoing", "completed", "cancelled"]);

// instructors.name is a generated column now (first_name + last_name). The quick "add instructor
// to a class" flows accept a single name string, so split it on the first space here.
function splitInstructorName(full: string): { first: string; last: string } {
  const name = full.trim();
  const sp = name.indexOf(" ");
  return sp > 0 ? { first: name.slice(0, sp), last: name.slice(sp + 1).trim() } : { first: name, last: "" };
}

// Auto-generate the next per-unit batch code (R001, R002, …). The unique index on
// (unit_id, batch_code) is the real guard; this just picks the next free number.
async function nextBatchCode(supabase: SupabaseClient, unitId: string): Promise<string> {
  const { data } = await supabase
    .from("classes")
    .select("batch_code")
    .eq("unit_id", unitId);
  let max = 0;
  for (const row of data ?? []) {
    const m = /^R(\d+)$/.exec(row.batch_code ?? "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `R${String(max + 1).padStart(3, "0")}`;
}

function readClassFields(formData: FormData) {
  return {
    courseId: String(formData.get("course_id") ?? ""),
    name: String(formData.get("name") ?? "").trim() || null,
    startDate: String(formData.get("start_date") ?? ""),
    endDate: String(formData.get("end_date") ?? ""),
    seatCount: Number(formData.get("seat_count")),
    scheduleTime: String(formData.get("schedule_time") ?? "").trim() || null,
    leadInstructorId: String(formData.get("lead_instructor_id") ?? "").trim() || null,
    mode: String(formData.get("mode") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    status: String(formData.get("status") ?? "planned").trim() || "planned",
    note: String(formData.get("note") ?? "").trim() || null,
  };
}

function validateClass(f: ReturnType<typeof readClassFields>): string | null {
  if (!f.courseId || !f.startDate || !f.endDate || !Number.isFinite(f.seatCount) || f.seatCount <= 0) {
    return "กรุณากรอกหลักสูตร วันเริ่ม–สิ้นสุด และจำนวนที่รองรับให้ครบถ้วน";
  }
  if (f.startDate > f.endDate) return "วันเริ่มต้องไม่มากกว่าวันสิ้นสุด";
  if (f.mode && !MODES.has(f.mode)) return "รูปแบบการเรียนไม่ถูกต้อง";
  if (!STATUSES.has(f.status)) return "สถานะรุ่นไม่ถูกต้อง";
  return null;
}

export async function createClass(_prev: ClassFormState, formData: FormData): Promise<ClassFormState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const f = readClassFields(formData);
  const err = validateClass(f);
  if (err) return { error: err };

  const supabase = await createClient();

  // Gate: the unit must have confirmed participation in some fiscal year; the class binds to it.
  const confirmed = await getUnitConfirmedRounds(supabase, unitId);
  const requestedFy = Number(formData.get("fiscal_year"));
  const target = resolveTargetRound(confirmed, Number.isInteger(requestedFy) ? requestedFy : null);
  if (!target) {
    return { error: confirmed.length === 0 ? NO_CONFIRMED_ROUND_ERROR : "ปีงบประมาณที่เลือกไม่ถูกต้อง" };
  }

  // If a lead instructor is given, verify it belongs to this unit's library.
  if (f.leadInstructorId) {
    const { data: ins } = await supabase
      .from("instructors")
      .select("instructor_id")
      .eq("instructor_id", f.leadInstructorId)
      .eq("unit_id", unitId)
      .maybeSingle();
    if (!ins) return { error: "ไม่พบหัวหน้าผู้สอนในคลังวิทยากรของหน่วย" };
  }

  // Retry once on the off chance two classes grab the same code concurrently.
  for (let attempt = 0; attempt < 2; attempt++) {
    const batchCode = await nextBatchCode(supabase, unitId);
    const { data: created, error } = await supabase
      .from("classes")
      .insert({
        course_id: f.courseId,
        unit_id: unitId,
        batch_code: batchCode,
        name: f.name,
        start_date: f.startDate,
        end_date: f.endDate,
        seat_count: f.seatCount,
        schedule_time: f.scheduleTime,
        lead_instructor_id: f.leadInstructorId,
        mode: f.mode,
        location: f.location,
        status: f.status,
        note: f.note,
        fiscal_year: target.fiscal_year,
        round_id: target.round_id,
      })
      .select("class_id")
      .single();

    if (!error && created) {
      // If a lead instructor was picked, make sure they're also linked to the class roster.
      if (f.leadInstructorId) {
        await supabase.from("class_instructors").upsert(
          { class_id: created.class_id, instructor_id: f.leadInstructorId, role_in_class: "หัวหน้าผู้สอน" },
          { onConflict: "class_id,instructor_id" },
        );
      }
      revalidatePath("/unit/classes");
      return { success: `สร้างชั้นเรียนรหัส ${batchCode} (ปีงบประมาณ ${target.fiscal_year}) เรียบร้อยแล้ว` };
    }
    if (!error.message.includes("classes_unit_batch_code_key")) {
      return { error: `บันทึกไม่สำเร็จ: ${error.message}` };
    }
  }
  return { error: "สร้างรหัสรุ่นไม่สำเร็จ กรุณาลองอีกครั้ง" };
}

export async function updateClass(_prev: ClassFormState, formData: FormData): Promise<ClassFormState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const classId = String(formData.get("class_id") ?? "");
  const f = readClassFields(formData);
  const err = validateClass(f);
  if (err) return { error: err };

  const supabase = await createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("class_id")
    .eq("class_id", classId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!cls) return { error: "ไม่พบชั้นเรียนนี้ในหน่วยของคุณ" };

  if (f.leadInstructorId) {
    const { data: ins } = await supabase
      .from("instructors")
      .select("instructor_id")
      .eq("instructor_id", f.leadInstructorId)
      .eq("unit_id", unitId)
      .maybeSingle();
    if (!ins) return { error: "ไม่พบหัวหน้าผู้สอนในคลังวิทยากรของหน่วย" };
  }

  const { error } = await supabase
    .from("classes")
    .update({
      course_id: f.courseId,
      name: f.name,
      start_date: f.startDate,
      end_date: f.endDate,
      seat_count: f.seatCount,
      schedule_time: f.scheduleTime,
      lead_instructor_id: f.leadInstructorId,
      mode: f.mode,
      location: f.location,
      status: f.status,
      note: f.note,
    })
    .eq("class_id", classId);
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  if (f.leadInstructorId) {
    await supabase.from("class_instructors").upsert(
      { class_id: classId, instructor_id: f.leadInstructorId, role_in_class: "หัวหน้าผู้สอน" },
      { onConflict: "class_id,instructor_id" },
    );
  }

  revalidatePath("/unit/classes");
  revalidatePath(`/unit/classes/${classId}`);
  return { success: "บันทึกการแก้ไขชั้นเรียนแล้ว" };
}

export type InstructorLinkState = { error?: string; success?: string };

// Link one or more existing library instructors to a class.
export async function addInstructorsFromLibrary(
  _prev: InstructorLinkState,
  formData: FormData,
): Promise<InstructorLinkState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const classId = String(formData.get("class_id") ?? "");
  const instructorIds = formData.getAll("instructor_id").map(String).filter(Boolean);
  const role = String(formData.get("role_in_class") ?? "").trim() || "วิทยากร";

  if (!classId || instructorIds.length === 0) return { error: "กรุณาเลือกวิทยากรอย่างน้อย 1 คน" };

  const supabase = await createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("class_id")
    .eq("class_id", classId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!cls) return { error: "ไม่พบชั้นเรียนนี้ในหน่วยของคุณ" };

  // Only accept instructor ids that are in this unit's library.
  const { data: libs } = await supabase
    .from("instructors")
    .select("instructor_id")
    .eq("unit_id", unitId)
    .in("instructor_id", instructorIds);
  const valid = new Set((libs ?? []).map((l) => l.instructor_id));

  const rows = instructorIds
    .filter((id) => valid.has(id))
    .map((id) => ({ class_id: classId, instructor_id: id, role_in_class: role }));
  if (rows.length === 0) return { error: "ไม่พบวิทยากรที่เลือกในคลังของหน่วย" };

  const { error } = await supabase
    .from("class_instructors")
    .upsert(rows, { onConflict: "class_id,instructor_id" });
  if (error) return { error: `เพิ่มวิทยากรเข้าชั้นเรียนไม่สำเร็จ: ${error.message}` };

  revalidatePath(`/unit/classes/${classId}`);
  return { success: `เพิ่มวิทยากร ${rows.length} คนเข้าชั้นเรียนแล้ว` };
}

// Create a brand-new instructor in the unit's library AND link it to this class in one step.
export async function createInstructorInClass(
  _prev: InstructorLinkState,
  formData: FormData,
): Promise<InstructorLinkState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const classId = String(formData.get("class_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const role = String(formData.get("role_in_class") ?? "").trim() || "วิทยากร";

  if (!classId || !name) return { error: "กรุณากรอกชื่อวิทยากร" };

  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("class_id")
    .eq("class_id", classId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!cls) return { error: "ไม่พบชั้นเรียนนี้ในหน่วยของคุณ" };

  // Reuse an existing library entry (same phone+email in this unit) or create a new one.
  let instructorId: string | null = null;
  if (phone || email) {
    let q = supabase.from("instructors").select("instructor_id").eq("unit_id", unitId);
    q = phone ? q.eq("phone", phone) : q.is("phone", null);
    q = email ? q.eq("email", email) : q.is("email", null);
    const { data } = await q.maybeSingle();
    instructorId = data?.instructor_id ?? null;
  }
  if (!instructorId) {
    const { first, last } = splitInstructorName(name);
    const { data: created, error: insErr } = await supabase
      .from("instructors")
      .insert({ first_name: first, last_name: last, phone, email, unit_id: unitId })
      .select("instructor_id")
      .single();
    if (insErr) return { error: `บันทึกวิทยากรไม่สำเร็จ: ${insErr.message}` };
    instructorId = created.instructor_id;
  }

  const { error: linkErr } = await supabase
    .from("class_instructors")
    .upsert({ class_id: classId, instructor_id: instructorId, role_in_class: role }, { onConflict: "class_id,instructor_id" });
  if (linkErr) return { error: `ผูกวิทยากรกับชั้นเรียนไม่สำเร็จ: ${linkErr.message}` };

  revalidatePath(`/unit/classes/${classId}`);
  revalidatePath("/unit/instructors");
  return { success: "เพิ่มวิทยากรเข้าชั้นเรียนและคลังแล้ว" };
}

export type ClassInstructorCsvState = { error?: string; created?: number; linked?: number };

// Bulk-add instructors to a class from CSV: each row is created in the unit library (deduped
// within the unit) then linked to this class.
export async function commitClassInstructorImport(
  _prev: ClassInstructorCsvState,
  formData: FormData,
): Promise<ClassInstructorCsvState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const classId = String(formData.get("class_id") ?? "");
  const role = String(formData.get("role_in_class") ?? "").trim() || "วิทยากร";
  type CsvRow = { first_name: string; last_name: string; gender: string; affiliation: string; tester_status: string; phone: string; email: string; status: string };
  const rows: CsvRow[] = JSON.parse(String(formData.get("rows") ?? "[]")).filter(
    (r: { status: string }) => r.status === "pass",
  );
  const asGender = (v: string) => (v === "male" || v === "female" || v === "other" ? v : null);
  const asTester = (v: string) => (v === "level_1" || v === "level_2" ? v : "none");
  if (!classId) return { error: "ไม่พบชั้นเรียน" };
  if (rows.length === 0) return { error: "ไม่มีแถวที่ผ่านการตรวจสอบให้นำเข้า" };

  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("class_id")
    .eq("class_id", classId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!cls) return { error: "ไม่พบชั้นเรียนนี้ในหน่วยของคุณ" };

  let created = 0;
  let linked = 0;
  for (const r of rows) {
    const phone = r.phone || null;
    const email = r.email || null;
    let instructorId: string | null = null;
    if (phone || email) {
      let q = supabase.from("instructors").select("instructor_id").eq("unit_id", unitId);
      q = phone ? q.eq("phone", phone) : q.is("phone", null);
      q = email ? q.eq("email", email) : q.is("email", null);
      const { data } = await q.maybeSingle();
      instructorId = data?.instructor_id ?? null;
    }
    if (!instructorId) {
      const { data: ins, error } = await supabase
        .from("instructors")
        .insert({
          first_name: r.first_name,
          last_name: r.last_name || "",
          gender: asGender(r.gender),
          affiliation: r.affiliation || null,
          tester_status: asTester(r.tester_status),
          phone,
          email,
          unit_id: unitId,
        })
        .select("instructor_id")
        .single();
      if (error) continue;
      instructorId = ins.instructor_id;
      created++;
    }
    const { error: linkErr } = await supabase
      .from("class_instructors")
      .upsert({ class_id: classId, instructor_id: instructorId, role_in_class: role }, { onConflict: "class_id,instructor_id" });
    if (!linkErr) linked++;
  }

  revalidatePath(`/unit/classes/${classId}`);
  revalidatePath("/unit/instructors");
  return { created, linked };
}

export async function removeInstructorFromClass(unitIdArg: string, classId: string, instructorId: string) {
  const { unitId } = await resolveActionUnit(unitIdArg);
  const supabase = await createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("class_id, lead_instructor_id")
    .eq("class_id", classId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!cls) throw new Error("ไม่พบชั้นเรียนนี้ในหน่วยของคุณ");

  await supabase.from("class_instructors").delete().eq("class_id", classId).eq("instructor_id", instructorId);
  // If this was the class's lead instructor, clear that too.
  if (cls.lead_instructor_id === instructorId) {
    await supabase.from("classes").update({ lead_instructor_id: null }).eq("class_id", classId);
  }
  revalidatePath(`/unit/classes/${classId}`);
}
