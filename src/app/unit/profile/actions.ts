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

function clean(formData: FormData, key: string): string | null {
  return String(formData.get(key) ?? "").trim() || null;
}

export async function upsertUnitProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const supabase = await createClient();

  // The institution name lives on training_units (NOT NULL + UNIQUE), not the profile row, so it
  // takes its own update. Done first: if the name clashes we bail before touching the profile.
  const name = clean(formData, "name");
  if (formData.has("name")) {
    if (!name) return { error: "กรุณากรอกชื่อสถาบัน" };
    const { error: nameErr } = await supabase.from("training_units").update({ name }).eq("unit_id", unitId);
    if (nameErr) {
      const dup = nameErr.code === "23505" || /duplicate|unique/i.test(nameErr.message);
      return { error: dup ? "มีหน่วยฝึกชื่อนี้อยู่แล้ว กรุณาใช้ชื่ออื่น" : `บันทึกชื่อไม่สำเร็จ: ${nameErr.message}` };
    }
  }

  const first = clean(formData, "coordinator_first_name");
  const last = clean(formData, "coordinator_last_name");
  const combined = [first, last].filter(Boolean).join(" ") || null;
  const tc = String(formData.get("is_food_testing_center") ?? "");
  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();
  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  // `address` (the legacy free-text column) is deliberately omitted so existing values are left
  // intact — it was superseded by the structured house_no/road/… fields.
  const { error } = await supabase.from("training_unit_profiles").upsert({
    unit_id: unitId,
    house_no: clean(formData, "house_no"),
    road: clean(formData, "road"),
    province_name: clean(formData, "province_name"),
    district_name: clean(formData, "district_name"),
    subdistrict_name: clean(formData, "subdistrict_name"),
    coordinator_first_name: first,
    coordinator_last_name: last,
    coordinator_name: combined,
    phone: clean(formData, "phone"),
    email: clean(formData, "email"),
    description: clean(formData, "description"),
    is_food_testing_center: tc === "true" ? true : tc === "false" ? false : null,
    latitude: hasCoords ? lat : null,
    longitude: hasCoords ? lng : null,
  });

  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/unit/profile");
  revalidatePath("/account");
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
  revalidatePath("/account");
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
  revalidatePath("/account");
}
