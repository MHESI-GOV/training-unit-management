import Link from "next/link";
import { resolvePageUnit } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { ImageUploader } from "./image-uploader";

export default async function UnitProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  const { unitId, isStaff } = await resolvePageUnit(unit_id);

  const supabase = await createClient();

  const [{ data: unitProfile }, { data: unit }, { data: images }] = await Promise.all([
    supabase
      .from("training_unit_profiles")
      .select("address, phone, email, coordinator_name, description")
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
    <main style={{ maxWidth: 560, margin: "3rem auto", fontFamily: "system-ui" }}>
      {isStaff && (
        <p>
          <Link href="/admin/units">กลับไปหน้าเลือกหน่วย</Link>
        </p>
      )}
      <h1>โปรไฟล์หน่วย: {unit?.name}</h1>
      <ProfileForm unitId={unitId} initial={unitProfile ?? null} />
      <h2 style={{ marginTop: 32 }}>ภาพถ่ายหน่วย</h2>
      <ImageUploader unitId={unitId} images={imagesWithUrls} count={imagesWithUrls.length} />
    </main>
  );
}
