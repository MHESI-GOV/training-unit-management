import { redirect } from "next/navigation";

// The dashboard moved to "/" (2026-10-20 decision: home page is now the public dashboard).
// This route stays as a redirect so old bookmarks/links with ?unit_id= keep working.
export default async function DashboardRedirect({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string }>;
}) {
  const { unit_id } = await searchParams;
  redirect(unit_id ? `/?unit_id=${unit_id}` : "/");
}
