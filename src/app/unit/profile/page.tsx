import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileForm } from "./profile-form";
import { ImageUploader } from "./image-uploader";

export default async function UnitProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff, profile } = await resolvePageUnit(unit_id);

  const supabase = await createClient();

  const [{ data: unitProfile }, { data: unit }, { data: images }] = await Promise.all([
    supabase
      .from("training_unit_profiles")
      .select(
        "house_no, road, province_name, district_name, subdistrict_name, address, phone, email, coordinator_first_name, coordinator_last_name, description, is_food_testing_center, latitude, longitude",
      )
      .eq("unit_id", unitId)
      .maybeSingle(),
    supabase.from("training_units").select("name").eq("unit_id", unitId).single(),
    supabase
      .from("training_unit_images")
      .select("image_id, storage_key, original_filename")
      .eq("unit_id", unitId)
      .eq("status", "active")
      .order("display_order"),
  ]);

  const imagesWithUrls = await Promise.all(
    (images ?? []).map(async (img) => {
      const { data } = await supabase.storage
        .from("unit-photos")
        .createSignedUrl(img.storage_key, 3600);
      return {
        image_id: img.image_id,
        original_filename: img.original_filename,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  return (
    <AppShell profile={profile} active="profile" eyebrow="โปรไฟล์หน่วยฝึก" title={unit?.name ?? "โปรไฟล์หน่วยฝึก"}>
      {isStaff && (
        <p style={{ marginBottom: 14 }}>
          <Link href="/admin/units">← กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}

      <section className="card" style={{ maxWidth: 680 }}>
        <ProfileForm unitId={unitId} unitName={unit?.name ?? ""} initial={unitProfile ?? null} />
      </section>

      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "24px 0 14px" }}>ภาพถ่ายหน่วย</h2>
      <ImageUploader unitId={unitId} images={imagesWithUrls} count={imagesWithUrls.length} />
    </AppShell>
  );
}
