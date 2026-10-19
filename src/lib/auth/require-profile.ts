import { redirect } from "next/navigation";
import { getCurrentProfile, type Profile } from "./get-profile";

export async function requireProfile(): Promise<Profile> {
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireWebMaster(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "web_master") redirect("/");
  return profile;
}
