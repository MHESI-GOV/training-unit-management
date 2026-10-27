"use server";

import { revalidatePath } from "next/cache";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import {
  encryptNationalId,
  hashNationalId,
  bufferToByteaHex,
  byteaHexToBuffer,
  decryptNationalId,
} from "@/lib/crypto/national-id";
import type { Database } from "@/lib/supabase/database.types";

type AssessmentStandard = Database["public"]["Enums"]["assessment_standard"];
type AssessmentResultValue = Database["public"]["Enums"]["assessment_result_enum"];

export type LearnerFormState = { error?: string; success?: string };

const NATIONAL_ID_RE = /^\d{13}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function createLearner(
  _prev: LearnerFormState,
  formData: FormData,
): Promise<LearnerFormState> {
  const { unitId, profile } = await resolveActionUnit(formData.get("unit_id")?.toString());

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const nationalId = String(formData.get("national_id") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const birthDate = String(formData.get("birth_date") ?? "").trim() || null;
  // When a learner is added from a class context the enrollment is mandatory — the
  // learner is recorded "into that class", not standalone (per the class-centric flow).
  const classId = String(formData.get("class_id") ?? "").trim() || null;

  if (!firstName || !lastName) return { error: "กรุณากรอกชื่อ-นามสกุล" };
  if (!NATIONAL_ID_RE.test(nationalId)) {
    return { error: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก" };
  }
  if (birthDate && !DATE_RE.test(birthDate)) {
    return { error: "วันเกิดต้องอยู่ในรูปแบบ ปปปป-ดด-วว" };
  }

  const supabase = await createClient();

  // If recording into a class, verify it belongs to this unit and check eligibility up front
  // for a readable message (the enforce_enrollment_eligibility trigger is still the hard backstop).
  let courseId: string | null = null;
  if (classId) {
    const { data: cls } = await supabase
      .from("classes")
      .select("course_id")
      .eq("class_id", classId)
      .eq("unit_id", unitId)
      .maybeSingle();
    if (!cls) return { error: "ไม่พบรุ่นฝึกอบรมนี้ในหน่วยของคุณ" };
    courseId = cls.course_id;

    const { data: eligibility, error: eligErr } = await supabase.rpc("check_learner_eligibility", {
      p_national_id_hash: hashNationalId(nationalId),
      p_course_id: courseId,
    });
    if (eligErr) return { error: `ตรวจสอบสิทธิ์ไม่สำเร็จ: ${eligErr.message}` };
    if (eligibility && eligibility !== "eligible") {
      return { error: ELIGIBILITY_LABEL[eligibility] ?? String(eligibility) };
    }
  }

  const { data: learner, error } = await supabase
    .from("learners")
    .insert({
      first_name: firstName,
      last_name: lastName,
      national_id_encrypted: bufferToByteaHex(encryptNationalId(nationalId)),
      national_id_hash: hashNationalId(nationalId),
      phone,
      email,
      address,
      birth_date: birthDate,
      source: "unit_self_entry",
      created_by: profile.id,
      unit_id: unitId,
    })
    .select("learner_id")
    .single();

  if (error || !learner) {
    const duplicate = error?.message.includes("learners_national_id_hash_key");
    return {
      error: duplicate
        ? "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว (อาจลงทะเบียนไว้ที่หน่วยอื่น)"
        : `บันทึกไม่สำเร็จ: ${error?.message}`,
    };
  }

  if (classId) {
    const { error: enrollErr } = await supabase
      .from("enrollments")
      .insert({ learner_id: learner.learner_id, class_id: classId });
    if (enrollErr) {
      return {
        error: `บันทึกผู้เรียนแล้ว แต่ลงรุ่นไม่สำเร็จ: ${enrollErr.message}`,
      };
    }
  }

  revalidatePath("/unit/learners");
  revalidatePath("/unit/import");
  return { success: classId ? "บันทึกผู้เรียนและลงรุ่นเรียบร้อยแล้ว" : "บันทึกผู้เรียนเรียบร้อยแล้ว" };
}

export type EnrollFormState = { error?: string; eligibility?: string };

const ELIGIBILITY_LABEL: Record<string, string> = {
  eligible: "มีสิทธิ์เข้าร่วม",
  blocked_already_completed: "ไม่มีสิทธิ์ — เคยสำเร็จหลักสูตรนี้แล้วที่หน่วยใดหน่วยหนึ่ง",
  blocked_disqualified: "ไม่มีสิทธิ์ — เคยลงทะเบียนหลักสูตรนี้แล้วไม่สำเร็จที่หน่วยใดหน่วยหนึ่ง",
};

export async function enrollLearner(
  _prev: EnrollFormState,
  formData: FormData,
): Promise<EnrollFormState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());

  const learnerId = String(formData.get("learner_id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  if (!learnerId || !classId) return { error: "กรุณาเลือกผู้เรียนและรุ่นฝึกอบรม" };

  const supabase = await createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("course_id")
    .eq("class_id", classId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!cls) return { error: "ไม่พบรุ่นฝึกอบรมนี้ในหน่วยของคุณ" };

  const { data: learner } = await supabase
    .from("learners")
    .select("national_id_hash")
    .eq("learner_id", learnerId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!learner) return { error: "ไม่พบผู้เรียนนี้ในหน่วยของคุณ" };

  // Proactive check for a readable message — enforce_enrollment_eligibility() on the
  // enrollments table is the actual hard backstop (§09 enforcement, can't be bypassed by
  // calling the insert directly), this call just avoids surfacing a raw Postgres exception.
  const { data: eligibility, error: eligErr } = await supabase.rpc("check_learner_eligibility", {
    p_national_id_hash: learner.national_id_hash,
    p_course_id: cls.course_id,
  });
  if (eligErr) return { error: `ตรวจสอบสิทธิ์ไม่สำเร็จ: ${eligErr.message}` };
  if (eligibility !== "eligible") {
    return { eligibility: ELIGIBILITY_LABEL[eligibility ?? ""] ?? eligibility ?? undefined };
  }

  const { error: insertErr } = await supabase.from("enrollments").insert({
    learner_id: learnerId,
    class_id: classId,
  });

  if (insertErr) return { error: `ลงทะเบียนไม่สำเร็จ: ${insertErr.message}` };

  revalidatePath("/unit/learners");
  return { eligibility: ELIGIBILITY_LABEL.eligible };
}

export async function markEnrollmentOutcome(
  unitIdArg: string,
  enrollmentId: string,
  outcome: "completed" | "failed",
) {
  const { unitId } = await resolveActionUnit(unitIdArg);
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("enrollment_id, learners!inner(unit_id)")
    .eq("enrollment_id", enrollmentId)
    .eq("learners.unit_id", unitId)
    .maybeSingle();
  if (!enrollment) throw new Error("ไม่พบการลงทะเบียนนี้ในหน่วยของคุณ");

  const { error: updateErr } = await supabase
    .from("enrollments")
    .update({ status: outcome })
    .eq("enrollment_id", enrollmentId);
  if (updateErr) throw new Error(updateErr.message);

  if (outcome === "completed") {
    const { error: certErr } = await supabase
      .from("certification_records")
      .insert({ enrollment_id: enrollmentId, certified_at: new Date().toISOString() });
    if (certErr) throw new Error(certErr.message);
  }

  revalidatePath("/unit/learners");
}

export type AssessmentFormState = { error?: string };

export async function recordAssessmentResult(
  _prev: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  const { unitId, profile } = await resolveActionUnit(formData.get("unit_id")?.toString());

  const learnerId = String(formData.get("learner_id") ?? "");
  const standardType = String(formData.get("standard_type") ?? "") as AssessmentStandard;
  const result = String(formData.get("result") ?? "") as AssessmentResultValue;
  const testedAt = String(formData.get("tested_at") ?? "") || null;
  const evidenceRef = String(formData.get("evidence_ref") ?? "").trim() || null;

  if (!learnerId || !standardType || !result) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  const supabase = await createClient();

  // §09 §2 — confirmed_by is normally the Unit Coordinator of the learner's own unit; this
  // also doubles as an ownership check (matches the learner's unit before accepting the insert).
  const { data: learner } = await supabase
    .from("learners")
    .select("learner_id")
    .eq("learner_id", learnerId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!learner) return { error: "ไม่พบผู้เรียนนี้ในหน่วยของคุณ" };

  const { error } = await supabase.from("assessment_results").insert({
    learner_id: learnerId,
    standard_type: standardType,
    result,
    tested_at: testedAt,
    evidence_ref: evidenceRef,
    confirmed_by: profile.id,
  });

  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/unit/learners");
  return {};
}

export async function revealNationalId(unitIdArg: string, learnerId: string): Promise<string> {
  const { unitId } = await resolveActionUnit(unitIdArg);
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from("learners")
    .select("national_id_encrypted")
    .eq("learner_id", learnerId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!learner) throw new Error("ไม่พบผู้เรียนนี้ในหน่วยของคุณ");

  return decryptNationalId(byteaHexToBuffer(learner.national_id_encrypted as unknown as string));
}
