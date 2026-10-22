"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireWebMaster } from "@/lib/auth/require-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCredentialsEmail } from "@/lib/email/send-credentials";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type GenerateUserState = {
  error?: string;
  result?: {
    email: string;
    username: string;
    temporaryPassword: string;
    emailSent: boolean;
  };
};

const VALID_ROLES = ["central_staff", "unit_coordinator", "executive"] as const;

export async function generateUser(
  _prevState: GenerateUserState,
  formData: FormData,
): Promise<GenerateUserState> {
  // §09 enforcement #11 — Generate User is Web-Master-only; re-checked here even though the
  // admin client below bypasses RLS entirely, since that bypass is exactly what must be gated.
  const webMaster = await requireWebMaster();

  const email = String(formData.get("email") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const role = String(formData.get("role") ?? "");

  if (!email || !displayName) {
    return { error: "กรุณากรอกชื่อและอีเมลให้ครบถ้วน" };
  }
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return { error: "บทบาทไม่ถูกต้อง" };
  }
  const validatedRole = role as (typeof VALID_ROLES)[number];

  const admin = createAdminClient();
  const temporaryPassword = randomBytes(18).toString("base64url");

  const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (userErr || !userRes.user) {
    return { error: `สร้างบัญชีไม่สำเร็จ: ${userErr?.message ?? "unknown error"}` };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: userRes.user.id,
    role: validatedRole,
    unit_scope: null, // role=unit_coordinator starts unscoped until they submit "กรอกข้อมูลหน่วยฝึกอบรม"
    display_name: displayName,
    must_change_password: true,
    created_by: webMaster.id,
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(userRes.user.id);
    return { error: `สร้างโปรไฟล์ไม่สำเร็จ: ${profileErr.message}` };
  }

  await admin.from("audit_log").insert({
    actor_user_id: webMaster.id,
    action: "generate_user",
    entity_type: "profile",
    record_id: userRes.user.id,
    changed_fields: ["role"],
  });

  const loginUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://training-unit-management.vercel.app";
  const emailResult = await sendCredentialsEmail({
    to: email,
    username: email,
    temporaryPassword,
    loginUrl: `${loginUrl}/login`,
  });

  return {
    result: {
      email,
      username: email,
      temporaryPassword,
      emailSent: emailResult.sent,
    },
  };
}

// Disable (ban) or re-enable a login account. User Management is meant to disable accounts, never
// hard-delete them (docs/planning §09; hard delete also FK-fails for any account that created a
// unit or has audit history). Web Master accounts can't be disabled here, to avoid locking the
// whole admin surface out. Ban is reversible: a disabled user keeps all their data/history and can
// be re-enabled anytime.
export type AdminDisableState = { error?: string; success?: string };

export async function adminSetDisabled(
  _prev: AdminDisableState,
  formData: FormData,
): Promise<AdminDisableState> {
  const wm = await requireWebMaster();
  const userId = String(formData.get("user_id") ?? "");
  const disabled = String(formData.get("disabled") ?? "") === "true";
  if (!userId) return { error: "ไม่พบบัญชี" };
  if (userId === wm.id) return { error: "ปิดบัญชีของตัวเองไม่ได้" };

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (target?.role === "web_master") {
    return { error: "ปิดบัญชี Web Master ไม่ได้ (ป้องกันการล็อกระบบผู้ดูแล)" };
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: disabled ? "876000h" : "none", // ~100 years = effectively disabled; "none" re-enables
  });
  if (error) return { error: `ดำเนินการไม่สำเร็จ: ${error.message}` };

  await admin.from("audit_log").insert({
    actor_user_id: wm.id,
    action: disabled ? "admin_disable_account" : "admin_enable_account",
    entity_type: "profile",
    record_id: userId,
    changed_fields: ["banned_until"],
  });

  revalidatePath("/admin/users");
  return { success: disabled ? "ปิดใช้งานบัญชีแล้ว" : "เปิดใช้งานบัญชีแล้ว" };
}

// --- Email-change request handling (self-service requests approved/rejected by Web Master) ---

export async function approveEmailChange(formData: FormData): Promise<void> {
  const wm = await requireWebMaster();
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("email_change_requests")
    .select("request_id, user_id, requested_email, status")
    .eq("request_id", requestId)
    .maybeSingle();
  if (!req || req.status !== "pending") return;

  const { error: updErr } = await admin.auth.admin.updateUserById(req.user_id, {
    email: req.requested_email,
    email_confirm: true,
  });

  if (updErr) {
    // Surface the failure to the WM by rejecting the request with the reason (e.g. the email is
    // already used by another account) instead of silently leaving it pending.
    await admin
      .from("email_change_requests")
      .update({
        status: "rejected",
        reject_reason: `อนุมัติไม่สำเร็จ: ${updErr.message}`,
        decided_at: new Date().toISOString(),
        decided_by: wm.id,
      })
      .eq("request_id", requestId);
    revalidatePath("/admin/users");
    return;
  }

  await admin
    .from("email_change_requests")
    .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: wm.id })
    .eq("request_id", requestId);
  await admin.from("audit_log").insert({
    actor_user_id: wm.id,
    action: "approve_email_change",
    entity_type: "profile",
    record_id: req.user_id,
    changed_fields: ["email"],
  });

  revalidatePath("/admin/users");
}

export async function rejectEmailChange(formData: FormData): Promise<void> {
  const wm = await requireWebMaster();
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;
  const reason = String(formData.get("reason") ?? "").trim() || "ไม่ระบุเหตุผล";

  const admin = createAdminClient();
  await admin
    .from("email_change_requests")
    .update({
      status: "rejected",
      reject_reason: reason,
      decided_at: new Date().toISOString(),
      decided_by: wm.id,
    })
    .eq("request_id", requestId)
    .eq("status", "pending");
  await admin.from("audit_log").insert({
    actor_user_id: wm.id,
    action: "reject_email_change",
    entity_type: "profile",
    record_id: requestId,
    changed_fields: [],
  });

  revalidatePath("/admin/users");
}

// --- Direct account maintenance by Web Master (handover: new coordinator takes over a unit) ---

export type AdminEmailState = { error?: string; success?: string };

export async function adminChangeEmail(
  _prev: AdminEmailState,
  formData: FormData,
): Promise<AdminEmailState> {
  const wm = await requireWebMaster();
  const userId = String(formData.get("user_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!userId) return { error: "ไม่พบบัญชี" };
  if (!EMAIL_RE.test(email)) return { error: "รูปแบบอีเมลไม่ถูกต้อง" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
  });
  if (error) return { error: `เปลี่ยนอีเมลไม่สำเร็จ: ${error.message}` };

  await admin.from("audit_log").insert({
    actor_user_id: wm.id,
    action: "admin_change_email",
    entity_type: "profile",
    record_id: userId,
    changed_fields: ["email"],
  });

  revalidatePath("/admin/users");
  return { success: `เปลี่ยนอีเมลเป็น ${email} แล้ว` };
}

export type AdminResetState = {
  error?: string;
  result?: { email: string; temporaryPassword: string; emailSent: boolean };
};

export async function adminResetPassword(
  _prev: AdminResetState,
  formData: FormData,
): Promise<AdminResetState> {
  const wm = await requireWebMaster();
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "ไม่พบบัญชี" };

  const admin = createAdminClient();
  const { data: u, error: getErr } = await admin.auth.admin.getUserById(userId);
  if (getErr || !u.user?.email) return { error: "ไม่พบอีเมลของบัญชีนี้" };
  const email = u.user.email;

  const temporaryPassword = randomBytes(18).toString("base64url");
  const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
  });
  if (updErr) return { error: `รีเซ็ตรหัสผ่านไม่สำเร็จ: ${updErr.message}` };

  // Force the user to set their own password on next login.
  await admin.from("profiles").update({ must_change_password: true }).eq("id", userId);
  await admin.from("audit_log").insert({
    actor_user_id: wm.id,
    action: "admin_reset_password",
    entity_type: "profile",
    record_id: userId,
    changed_fields: ["password"],
  });

  const loginUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://training-unit-management.vercel.app";
  const emailResult = await sendCredentialsEmail({
    to: email,
    username: email,
    temporaryPassword,
    loginUrl: `${loginUrl}/login`,
  });

  revalidatePath("/admin/users");
  return { result: { email, temporaryPassword, emailSent: emailResult.sent } };
}
