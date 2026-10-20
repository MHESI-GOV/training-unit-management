import { findOrphanPhotos, recordOrphanReport } from "@/lib/storage/orphan-check";

// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>" automatically when
// CRON_SECRET is set as an env var -- see vercel.json for the weekly schedule. No user
// session exists here, so this is the one place in the app that's authorized purely by
// that shared secret rather than a Supabase role check.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const orphanKeys = await findOrphanPhotos();
  await recordOrphanReport(orphanKeys);

  return Response.json({ orphan_count: orphanKeys.length });
}
