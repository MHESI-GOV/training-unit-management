import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { ImageUploader } from "./image-uploader";

// Shared unit-profile section (info form + photos) used both by the staff page
// (/unit/profile?unit_id=) and, for a Unit Coordinator, inlined into their own /account page --
// since one coordinator account maps to exactly one unit, the unit profile IS their profile.
export async function UnitProfilePanel({ unitId }: { unitId: string }) {
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
      const { data } = await supabase.storage.from("unit-photos").createSignedUrl(img.storage_key, 3600);
      return {
        image_id: img.image_id,
        original_filename: img.original_filename,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  return (
    <>
      <section className="card" style={{ maxWidth: 680 }}>
        <ProfileForm unitId={unitId} unitName={unit?.name ?? ""} initial={unitProfile ?? null} />
      </section>

      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "24px 0 14px" }}>ภาพถ่ายหน่วย</h2>
      <ImageUploader unitId={unitId} images={imagesWithUrls} count={imagesWithUrls.length} />
    </>
  );
}
