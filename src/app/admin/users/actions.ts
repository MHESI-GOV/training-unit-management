"use server";

import { randomBytes } from "node:crypto";
import { requireWebMaster } from "@/lib/auth/require-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCredentialsEmail } from "@/lib/email/send-credentials";

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
    role,
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
