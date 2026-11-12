"use server";

import { normalizePhone } from "@/lib/phone";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/require-profile";
import { resolveActionUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { REGION_LABEL } from "@/lib/labels";
import type { Database } from "@/lib/supabase/database.types";

const MAX_FILE_BYTES = 3 * 1024 * 1024;

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
  const { profile, unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const phoneN = normalizePhone(formData.get("phone")?.toString());
  if (phoneN.error) return { error: phoneN.error };
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

  // Region: only Web Master / Central Staff may change it (it drives the unit code and region stats);
  // a coordinator's form never sends it, and one sent anyway is ignored.
  const region = clean(formData, "region");
  if (region && (profile.role === "web_master" || profile.role === "central_staff")) {
    if (!(region in REGION_LABEL)) return { error: "ภูมิภาคไม่ถูกต้อง" };
    const { error: regionErr } = await supabase
      .from("training_units")
      .update({ region: region as Database["public"]["Enums"]["region_type"] })
      .eq("unit_id", unitId);
    if (regionErr) return { error: `บันทึกภูมิภาคไม่สำเร็จ: ${regionErr.message}` };
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
    phone: phoneN.value,
    email: clean(formData, "email"),
    description: clean(formData, "description"),
    is_food_testing_center: tc === "true" ? true : tc === "false" ? false : null,
    latitude: hasCoords ? lat : null,
    longitude: hasCoords ? lng : null,
  });

  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/unit/profile");
  revalidatePath("/account");
  revalidatePath("/admin/units");
  return { success: true };
}

export type UploadState = { error?: string; success?: boolean };

// A unit's photos appear on the staff unit list and the public Home/dashboard map too.
function revalidateUnitPhotos() {
  revalidatePath("/unit/profile");
  revalidatePath("/account");
  revalidatePath("/admin/units");
  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function uploadUnitImage(formData: FormData): Promise<UploadState> {
  const { unitId } = await resolveActionUnit(formData.get("unit_id")?.toString());
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "กรุณาเลือกไฟล์ภาพ" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "ไฟล์ใหญ่เกิน 3MB" };
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

  // New photos go last, so the first one uploaded stays the cover until someone reorders.
  const { data: last } = await supabase
    .from("training_unit_images")
    .select("display_order")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const profile = await requireProfile();
  const { error: insertErr } = await supabase.from("training_unit_images").insert({
    unit_id: unitId,
    storage_key: storageKey,
    original_filename: file.name,
    mime_type: signature.mime,
    file_size: file.size,
    display_order: last ? last.display_order + 1 : 0,
    uploaded_by: profile.id,
  });

  if (insertErr) {
    await supabase.storage.from("unit-photos").remove([storageKey]);
    const tooMany = insertErr.message.includes("max 6 images");
    return { error: tooMany ? "หน่วยนี้มีภาพครบ 6 ภาพแล้ว" : `บันทึกไม่สำเร็จ: ${insertErr.message}` };
  }

  revalidateUnitPhotos();
  return { success: true };
}

export async function reorderUnitImages(unitIdArg: string, imageIds: string[]): Promise<UploadState> {
  const { unitId } = await resolveActionUnit(unitIdArg);
  const supabase = await createClient();

  const { data: current, error: readErr } = await supabase
    .from("training_unit_images")
    .select("image_id")
    .eq("unit_id", unitId)
    .eq("status", "active");
  if (readErr) return { error: `บันทึกลำดับภาพไม่สำเร็จ: ${readErr.message}` };

  const currentIds = new Set((current ?? []).map((row) => row.image_id));
  if (imageIds.length !== currentIds.size || !imageIds.every((id) => currentIds.has(id))) {
    return { error: "รายการภาพมีการเปลี่ยนแปลง กรุณารีเฟรชหน้านี้แล้วลองใหม่" };
  }

  const results = await Promise.all(
    imageIds.map((imageId, index) =>
      supabase
        .from("training_unit_images")
        .update({ display_order: index })
        .eq("image_id", imageId)
        .eq("unit_id", unitId)
        .select("image_id"),
    ),
  );
  // A missing RLS policy doesn't error, it updates 0 rows, so check the rows came back too.
  if (results.some((r) => r.error || r.data?.length !== 1)) {
    return { error: "บันทึกลำดับภาพไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidateUnitPhotos();
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
  revalidateUnitPhotos();
}
