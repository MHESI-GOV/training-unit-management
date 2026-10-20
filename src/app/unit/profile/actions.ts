"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/require-profile";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Real file-signature check (magic bytes), not just trusting the extension/MIME header
// the browser reports — per docs/planning/10-image-storage-options.md §3.
const SIGNATURES: { mime: string; ext: string; check: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    ext: "png",
    check: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a,
  },
];

export type ProfileFormState = { error?: string; success?: boolean };

export async function upsertUnitProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const supabase = await createClient();

  const { error } = await supabase.from("training_unit_profiles").upsert({
    unit_id: unitId,
    address: String(formData.get("address") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    coordinator_name: String(formData.get("coordinator_name") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
  });

  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/unit/profile");
  return { success: true };
}

export type UploadState = { error?: string; success?: boolean };

export async function uploadUnitImage(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "กรุณาเลือกไฟล์ภาพ" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "ไฟล์ใหญ่เกิน 10MB" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const signature = SIGNATURES.find((s) => s.check(buffer));
  if (!signature) {
    return { error: "รองรับเฉพาะไฟล์ JPEG หรือ PNG เท่านั้น" };
  }

  const supabase = await createClient();
  const storageKey = `${unitId}/${randomUUID()}.${signature.ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("unit-photos")
    .upload(storageKey, buffer, { contentType: signature.mime });

  if (uploadErr) return { error: `อัปโหลดไม่สำเร็จ: ${uploadErr.message}` };

  const profile = await requireProfile();
  const { error: insertErr } = await supabase.from("training_unit_images").insert({
    unit_id: unitId,
    storage_key: storageKey,
    original_filename: file.name,
    mime_type: signature.mime,
    file_size: file.size,
    uploaded_by: profile.id,
  });

  if (insertErr) {
    await supabase.storage.from("unit-photos").remove([storageKey]);
    const tooMany = insertErr.message.includes("max 6 images");
    return { error: tooMany ? "หน่วยนี้มีภาพครบ 6 ภาพแล้ว" : `บันทึกไม่สำเร็จ: ${insertErr.message}` };
  }

  revalidatePath("/unit/profile");
  return { success: true };
}

export async function deleteUnitImage(unitIdArg: string, imageId: string) {
  const { unitId } = await resolveActionUnit(unitIdArg);
  const supabase = await createClient();

  // Soft-delete only (§10 §3) — the storage object stays until a separate retention/cleanup
  // pass removes it, so a photo referenced in an already-printed report isn't pulled out from
  // under it.
  const { error } = await supabase
    .from("training_unit_images")
    .update({ status: "deleted" })
    .eq("image_id", imageId)
    .eq("unit_id", unitId);

  if (error) throw new Error(error.message);
  revalidatePath("/unit/profile");
}
