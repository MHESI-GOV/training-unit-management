import { createAdminClient } from "@/lib/supabase/admin";

// Public, unauthenticated image endpoint for the dashboard/Home map hover-card. Serves a training
// unit's FIRST facility photo by unit_id. Uses the service-role client because the public map (anon)
// must show these, and the unit-photos bucket is private. It exposes ONLY unit facility photos keyed
// by unit_id — never learner data and never arbitrary storage paths (the key is looked up from the
// DB, not taken from the request). Returns 404 when the unit has no photo (the UI falls back to a
// placeholder). This is the one deliberate public read-path into unit-photos.
export async function GET(_req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(unitId)) return new Response("bad request", { status: 400 });

  const admin = createAdminClient();
  const { data: img } = await admin
    .from("training_unit_images")
    .select("storage_key")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .order("display_order", { nullsFirst: false })
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!img?.storage_key) return new Response("not found", { status: 404 });

  const { data: blob, error } = await admin.storage.from("unit-photos").download(img.storage_key);
  if (error || !blob) return new Response("not found", { status: 404 });

  const buf = Buffer.from(await blob.arrayBuffer());
  return new Response(buf as BodyInit, {
    headers: {
      "Content-Type": blob.type || "image/jpeg",
      "Cache-Control": "public, max-age=300",
    },
  });
}
