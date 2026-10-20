"use server";

import { revalidatePath } from "next/cache";
import { requireWebMaster } from "@/lib/auth/require-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrphanPhotos, recordOrphanReport } from "@/lib/storage/orphan-check";

export async function runOrphanCheckNow() {
  await requireWebMaster();
  const orphanKeys = await findOrphanPhotos();
  await recordOrphanReport(orphanKeys);
  revalidatePath("/admin/storage-audit");
}

// One file at a time, only ever triggered by an explicit Web Master click after reviewing
// the list -- never automatic, per docs/planning/10-image-storage-options.md §3.
export async function deleteOrphanFile(reportId: string, storageKey: string) {
  await requireWebMaster();
  const admin = createAdminClient();

  const { error } = await admin.storage.from("unit-photos").remove([storageKey]);
  if (error) throw new Error(`ลบไฟล์ไม่สำเร็จ: ${error.message}`);

  const { data: report } = await admin
    .from("storage_orphan_reports")
    .select("orphan_keys")
    .eq("report_id", reportId)
    .single();
  const remaining = (report?.orphan_keys ?? []).filter((k) => k !== storageKey);
  await admin
    .from("storage_orphan_reports")
    .update({ orphan_keys: remaining, orphan_count: remaining.length })
    .eq("report_id", reportId);

  revalidatePath("/admin/storage-audit");
}
