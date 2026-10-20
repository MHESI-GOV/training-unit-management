import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "unit-photos";

// Storage objects are stored as <unit_id>/<filename> (see supabase/migrations/
// 20261019130000_unit_images_and_storage.sql). list() is not recursive, so folders
// (unit ids) have to be listed first, then each folder's files listed individually.
export async function findOrphanPhotos(): Promise<string[]> {
  const admin = createAdminClient();

  const { data: topLevel, error: topErr } = await admin.storage.from(BUCKET).list("", { limit: 1000 });
  if (topErr) throw new Error(`ลิสต์โฟลเดอร์ไม่สำเร็จ: ${topErr.message}`);

  const unitFolders = (topLevel ?? []).filter((entry) => entry.id === null).map((entry) => entry.name);

  const allKeys: string[] = [];
  for (const unitId of unitFolders) {
    const { data: files, error } = await admin.storage.from(BUCKET).list(unitId, { limit: 1000 });
    if (error) throw new Error(`ลิสต์ไฟล์เป็นหน่วยไม่สำเร็จ (${unitId}): ${error.message}`);
    for (const file of files ?? []) {
      if (file.id !== null) allKeys.push(`${unitId}/${file.name}`);
    }
  }

  if (allKeys.length === 0) return [];

  // Any status counts -- a soft-deleted row (status='deleted') still intentionally keeps its
  // storage object per the retention policy in docs/planning/10-image-storage-options.md §3,
  // so it's a referenced file, not an orphan.
  const { data: knownRows, error: knownErr } = await admin
    .from("training_unit_images")
    .select("storage_key");
  if (knownErr) throw new Error(`อ่าน training_unit_images ไม่สำเร็จ: ${knownErr.message}`);

  const knownKeys = new Set((knownRows ?? []).map((r) => r.storage_key));
  return allKeys.filter((key) => !knownKeys.has(key));
}

export async function recordOrphanReport(orphanKeys: string[]): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("storage_orphan_reports").insert({
    orphan_keys: orphanKeys,
    orphan_count: orphanKeys.length,
  });
  if (error) throw new Error(`บันทึกรายงานไม่สำเร็จ: ${error.message}`);
}
