import { redirect } from "next/navigation";
import { requireProfile } from "./require-profile";
import type { Profile } from "./get-profile";

const STAFF_ROLES = ["web_master", "central_staff"] as const;

function isStaffRole(role: Profile["role"]): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

// Every /unit/* page: Unit Coordinator is always scoped to their own unit (any unit_id in the
// URL is ignored, never trusted); Web Master/Central Staff pick any unit via ?unit_id= from
// /admin/units, since §09 round 3 gives them full data parity. RLS is the real backstop either
// way — this just decides what the page renders / redirects to.
export async function resolvePageUnit(
  rawUnitId: string | undefined,
): Promise<{ profile: Profile; unitId: string; isStaff: boolean }> {
  const profile = await requireProfile();

  if (profile.role === "unit_coordinator") {
    if (!profile.unit_scope) redirect("/");
    return { profile, unitId: profile.unit_scope, isStaff: false };
  }

  if (isStaffRole(profile.role)) {
    if (!rawUnitId) redirect("/admin/units");
    return { profile, unitId: rawUnitId, isStaff: true };
  }

  redirect("/");
}

// Server actions can't read the URL, so the chosen unit_id travels as a hidden form field
// (or a bound argument for non-form actions) instead — same trust rule as above, Unit
// Coordinator's own unit_scope always wins over whatever was posted.
export async function resolveActionUnit(
  candidateUnitId: string | null | undefined,
): Promise<{ profile: Profile; unitId: string }> {
  const profile = await requireProfile();

  if (profile.role === "unit_coordinator") {
    if (!profile.unit_scope) throw new Error("บัญชีนี้ไม่มีหน่วยฝึกอบรมที่จัดการได้");
    return { profile, unitId: profile.unit_scope };
  }

  if (isStaffRole(profile.role)) {
    if (!candidateUnitId) throw new Error("ไม่พบหน่วยฝึกอบรมที่เลือก");
    return { profile, unitId: candidateUnitId };
  }

  throw new Error("ไม่มีสิทธิ์ดำเนินการนี้");
}

export async function requireStaffProfile(): Promise<Profile> {
  const profile = await requireProfile();
  if (!isStaffRole(profile.role)) redirect("/");
  return profile;
}
