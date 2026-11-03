import { createAdminClient } from "@/lib/supabase/admin";

// Public, unauthenticated image endpoint for the dashboard/Home map hover-card. Serves one of a
// training unit's facility photos: ?image=<image_id>, or its cover when omitted. Uses the service-role client because the public map (anon)
// must show these, and the unit-photos bucket is private. It exposes ONLY unit facility photos keyed
// by unit_id — never learner data and never arbitrary storage paths (the key is looked up from the
// DB, not taken from the request, and ?image must belong to that unit). Returns 404 when the unit has no photo (the UI falls back to a
// placeholder). This is the one deliberate public read-path into unit-photos.
const UUID = /^[0-9a-f-]{36}$/i;
const NOT_FOUND = { status: 404, headers: { "Cache-Control": "no-store" } };

export async function GET(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const imageId = new URL(req.url).searchParams.get("image");
  if (!UUID.test(unitId) || (imageId && !UUID.test(imageId))) return new Response("bad request", { status: 400 });

  const admin = createAdminClient();
  let query = admin
    .from("training_unit_images")
    .select("storage_key")
    .eq("unit_id", unitId)
    .eq("status", "active");
  if (imageId) query = query.eq("image_id", imageId);
  const { data: img } = await query
    .order("display_order", { nullsFirst: false })
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!img?.storage_key) return new Response("not found", NOT_FOUND);

  const { data: blob, error } = await admin.storage.from("unit-photos").download(img.storage_key);
  if (error || !blob) return new Response("not found", NOT_FOUND);

  const buf = Buffer.from(await blob.arrayBuffer());
  return new Response(buf as BodyInit, {
    headers: {
      "Content-Type": blob.type || "image/jpeg",
      // A given image_id's bytes never change, so it can cache for longer. The cover URL stays short
      // because which photo is the cover changes when someone reorders or deletes.
      "Cache-Control": imageId ? "public, max-age=3600" : "public, max-age=60",
    },
  });
}
