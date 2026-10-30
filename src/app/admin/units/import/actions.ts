"use server";

import { revalidatePath } from "next/cache";
import { requireStaffProfile } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { readUploadedRows } from "@/lib/import-file";
import { UNIT_TYPE_LABEL, REGION_LABEL } from "@/lib/labels";
import type { Database } from "@/lib/supabase/database.types";

type UnitType = Database["public"]["Enums"]["unit_type"];
type RegionType = Database["public"]["Enums"]["region_type"];

export type UnitPreviewRow = {
  rowNumber: number;
  name: string;
  type: string;
  region: string;
  province_name: string;
  district_name: string;
  subdistrict_name: string;
  house_no: string;
  road: string;
  phone: string;
  email: string;
  coordinator_first_name: string;
  coordinator_last_name: string;
  is_food_testing_center: string;
  latitude: string;
  longitude: string;
  external_ref: string;
  status: "pass" | "fail";
  reason?: string;
};

export type PreviewState = {
  error?: string;
  fileName?: string;
  rows?: UnitPreviewRow[];
  passCount?: number;
  failCount?: number;
};

const g = (r: Record<string, string>, k: string) => (r[k] ?? "").trim();

export async function previewUnitImport(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  await requireStaffProfile();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "กรุณาเลือกไฟล์ CSV หรือ Excel (.xlsx)" };
  }

  const { rows: data, error: readErr } = await readUploadedRows(file);
  if (readErr || !data) return { error: readErr ?? "อ่านไฟล์ไม่สำเร็จ" };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("training_units").select("name");
  const existingNames = new Set((existing ?? []).map((u) => u.name.trim().toLowerCase()));

  const seenInFile = new Set<string>();
  const rows: UnitPreviewRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const name = g(r, "name");
    const type = g(r, "type").toLowerCase();
    const region = g(r, "region").toLowerCase();
    const tc = g(r, "is_food_testing_center").toLowerCase();
    const latRaw = g(r, "latitude");
    const lngRaw = g(r, "longitude");

    let status: "pass" | "fail" = "pass";
    let reason: string | undefined;

    const key = name.toLowerCase();
    if (!name) {
      status = "fail";
      reason = "ต้องมีชื่อสถาบัน";
    } else if (!(type in UNIT_TYPE_LABEL)) {
      status = "fail";
      reason = "ประเภทหน่วยต้องเป็น university / vocational / other";
    } else if (!(region in REGION_LABEL)) {
      status = "fail";
      reason = "ภูมิภาคไม่ถูกต้อง";
    } else if (existingNames.has(key)) {
      status = "fail";
      reason = "มีหน่วยชื่อนี้อยู่แล้วในระบบ";
    } else if (seenInFile.has(key)) {
      status = "fail";
      reason = "ชื่อซ้ำกับอีกแถวในไฟล์";
    } else if (tc && tc !== "true" && tc !== "false") {
      status = "fail";
      reason = "is_food_testing_center ต้องเป็น true / false";
    } else if (latRaw && !Number.isFinite(Number(latRaw))) {
      status = "fail";
      reason = "latitude ต้องเป็นตัวเลข";
    } else if (lngRaw && !Number.isFinite(Number(lngRaw))) {
      status = "fail";
      reason = "longitude ต้องเป็นตัวเลข";
    }
    if (status === "pass") seenInFile.add(key);

    rows.push({
      rowNumber: i + 2,
      name,
      type,
      region,
      province_name: g(r, "province_name"),
      district_name: g(r, "district_name"),
      subdistrict_name: g(r, "subdistrict_name"),
      house_no: g(r, "house_no"),
      road: g(r, "road"),
      phone: g(r, "phone"),
      email: g(r, "email"),
      coordinator_first_name: g(r, "coordinator_first_name"),
      coordinator_last_name: g(r, "coordinator_last_name"),
      is_food_testing_center: tc,
      latitude: latRaw,
      longitude: lngRaw,
      external_ref: g(r, "external_ref"),
      status,
      reason,
    });
  }

  return {
    fileName: file.name,
    rows,
    passCount: rows.filter((r) => r.status === "pass").length,
    failCount: rows.filter((r) => r.status === "fail").length,
  };
}

export type CommitState = { error?: string; created?: number; failed?: number };

export async function commitUnitImport(
  _prev: CommitState,
  formData: FormData,
): Promise<CommitState> {
  const profile = await requireStaffProfile();

  const rowsJson = String(formData.get("rows") ?? "[]");
  const fileName = String(formData.get("file_name") ?? "unit_import");
  const rows: UnitPreviewRow[] = JSON.parse(rowsJson).filter((r: UnitPreviewRow) => r.status === "pass");
  if (rows.length === 0) return { error: "ไม่มีแถวที่ผ่านการตรวจสอบให้นำเข้า" };

  const supabase = await createClient();

  const { data: job } = await supabase
    .from("import_jobs")
    .insert({
      uploaded_by: profile.id,
      file_name: fileName,
      total_rows: rows.length,
      status: "processing",
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    })
    .select()
    .single();

  let created = 0;
  let failed = 0;

  for (const row of rows) {
    const { data: unitId, error: createErr } = await supabase.rpc("create_training_unit_as_staff", {
      p_name: row.name,
      p_type: row.type as UnitType,
      p_region: row.region as RegionType,
      p_external_ref: row.external_ref || undefined,
    });

    if (createErr || !unitId) {
      failed++;
      if (job) {
        await supabase.from("import_errors").insert({
          job_id: job.job_id,
          row_number: row.rowNumber,
          column_name: "name",
          reason: createErr?.message ?? "create failed",
        });
      }
      continue;
    }
    created++;

    // Fill the profile row (best-effort; the unit already exists and is editable from its data-sheet).
    const lat = row.latitude ? Number(row.latitude) : null;
    const lng = row.longitude ? Number(row.longitude) : null;
    const first = row.coordinator_first_name || null;
    const last = row.coordinator_last_name || null;
    const combined = [first, last].filter(Boolean).join(" ") || null;
    await supabase.from("training_unit_profiles").upsert({
      unit_id: unitId,
      house_no: row.house_no || null,
      road: row.road || null,
      province_name: row.province_name || null,
      district_name: row.district_name || null,
      subdistrict_name: row.subdistrict_name || null,
      coordinator_first_name: first,
      coordinator_last_name: last,
      coordinator_name: combined,
      phone: row.phone || null,
      email: row.email || null,
      is_food_testing_center:
        row.is_food_testing_center === "true" ? true : row.is_food_testing_center === "false" ? false : null,
      latitude: Number.isFinite(lat as number) ? lat : null,
      longitude: Number.isFinite(lng as number) ? lng : null,
    });
  }

  if (job) {
    await supabase
      .from("import_jobs")
      .update({ passed_rows: created, failed_rows: failed, status: "completed" })
      .eq("job_id", job.job_id);
  }

  revalidatePath("/admin/units");
  return { created, failed };
}
