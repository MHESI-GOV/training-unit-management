"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { requireProfile } from "@/lib/auth/require-profile";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChangePasswordState = { error?: string; success?: boolean };
export type EmailRequestState = { error?: string; success?: boolean };
export type AvatarState = { error?: string; success?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Real file-signature check (magic bytes), same approach as the unit-photo uploader.
const AVATAR_SIGNATURES: { mime: string; ext: string; check: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    ext: "png",
    check: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a,
  },
];

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const profile = await requireProfile();
  const { email } = await getCurrentProfile();

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!current || !next) return { error: "กรุณากรอกรหัสผ่านให้ครบถ้วน" };
  if (next.length < 8) return { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" };
  if (next !== confirm) return { error: "รหัสผ่านใหม่และการยืนยันไม่ตรงกัน" };
  if (next === current) return { error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม" };
  if (!email) return { error: "ไม่พบอีเมลของบัญชีนี้" };

  // Re-authenticate on a THROWAWAY client that does not persist a session, so it never touches
  // the caller's real session cookies. Doing signInWithPassword on the cookie-bound server
  // client would mint a fresh AAL1 session and overwrite an MFA user's AAL2 session -- the
  // subsequent updateUser would then fail with "AAL2 session is required to update email or
  // password when MFA is enabled" (hit by Web Master accounts, which always have MFA).
  const verifier = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error: reauthErr } = await verifier.auth.signInWithPassword({
    email,
    password: current,
  });
  if (reauthErr) return { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };

  // Update on the real server client, whose existing session keeps its assurance level (AAL2
  // for MFA users), so Supabase accepts the password change.
  const supabase = await createClient();
  const { error: updErr } = await supabase.auth.updateUser({ password: next });
  if (updErr) return { error: `เปลี่ยนรหัสผ่านไม่สำเร็จ: ${updErr.message}` };

  // profiles_update RLS is Web-Master-only, so clear the first-login flag via the admin client.
  const admin = createAdminClient();
  await admin.from("profiles").update({ must_change_password: false }).eq("id", profile.id);
  await admin.from("audit_log").insert({
    actor_user_id: profile.id,
    action: "change_password",
    entity_type: "profile",
    record_id: profile.id,
    changed_fields: ["password"],
  });

  revalidatePath("/account");
  return { success: true };
}

export async function requestEmailChange(
  _prev: EmailRequestState,
  formData: FormData,
): Promise<EmailRequestState> {
  const profile = await requireProfile();
  const { email } = await getCurrentProfile();

  const requested = String(formData.get("requested_email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(requested)) return { error: "รูปแบบอีเมลไม่ถูกต้อง" };
  if (email && requested === email.toLowerCase()) {
    return { error: "อีเมลใหม่ต้องไม่ซ้ำกับอีเมลปัจจุบัน" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("email_change_requests").insert({
    user_id: profile.id,
    current_email: email ?? "",
    requested_email: requested,
    status: "pending",
  });

  if (error) {
    // Partial unique index violation -> there is already a pending request.
    if (error.code === "23505") {
      return { error: "มีคำขอเปลี่ยนอีเมลที่รอผู้ดูแลระบบอนุมัติอยู่แล้ว" };
    }
    return { error: `ส่งคำขอไม่สำเร็จ: ${error.message}` };
  }

  revalidatePath("/account");
  return { success: true };
}

export async function cancelEmailRequest(formData: FormData): Promise<void> {
  await requireProfile();
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;

  const supabase = await createClient();
  // RLS (ecr_delete_own_pending) restricts this to the caller's own pending request.
  await supabase
    .from("email_change_requests")
    .delete()
    .eq("request_id", requestId)
    .eq("status", "pending");

  revalidatePath("/account");
}

export async function uploadAvatar(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const profile = await requireProfile();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) return { error: "กรุณาเลือกไฟล์รูปภาพ" };
  if (file.size > MAX_AVATAR_BYTES) return { error: "ไฟล์ใหญ่เกิน 5MB" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const signature = AVATAR_SIGNATURES.find((s) => s.check(buffer));
  if (!signature) return { error: "รองรับเฉพาะไฟล์ JPEG หรือ PNG เท่านั้น" };

  const supabase = await createClient();
  const storageKey = `${profile.id}/${randomUUID()}.${signature.ext}`;

  // Storage RLS (avatars_insert_own) scopes this to the caller's own "<uid>/" folder.
  const { error: uploadErr } = await supabase.storage
    .from("avatars")
    .upload(storageKey, buffer, { contentType: signature.mime });
  if (uploadErr) return { error: `อัปโหลดไม่สำเร็จ: ${uploadErr.message}` };

  // profiles_update is Web-Master-only, so set avatar_path via the admin client.
  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("profiles")
    .update({ avatar_path: storageKey })
    .eq("id", profile.id);
  if (updErr) {
    await supabase.storage.from("avatars").remove([storageKey]);
    return { error: `บันทึกไม่สำเร็จ: ${updErr.message}` };
  }

  // Remove the previous avatar file so each user keeps only one (no orphan build-up).
  if (profile.avatar_path && profile.avatar_path !== storageKey) {
    await supabase.storage.from("avatars").remove([profile.avatar_path]);
  }

  await admin.from("audit_log").insert({
    actor_user_id: profile.id,
    action: "update_avatar",
    entity_type: "profile",
    record_id: profile.id,
    changed_fields: ["avatar_path"],
  });

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function removeAvatar(): Promise<void> {
  const profile = await requireProfile();
  if (!profile.avatar_path) return;

  const supabase = await createClient();
  await supabase.storage.from("avatars").remove([profile.avatar_path]);

  const admin = createAdminClient();
  await admin.from("profiles").update({ avatar_path: null }).eq("id", profile.id);

  revalidatePath("/account");
  revalidatePath("/", "layout");
}
