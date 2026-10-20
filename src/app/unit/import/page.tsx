import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { ImportClient } from "./import-client";

export default async function UnitImportPage() {
  const profile = await requireProfile();
  if (profile.role !== "unit_coordinator" || !profile.unit_scope) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("class_id, start_date, courses(name)")
    .eq("unit_id", profile.unit_scope)
    .order("start_date", { ascending: false });

  const classOptions = (classes ?? []).map((c) => ({
    class_id: c.class_id,
    label: `${c.courses?.name} (${c.start_date})`,
  }));

  return (
    <main style={{ maxWidth: 720, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>นำเข้าผู้เรียนจากไฟล์ CSV</h1>
      <ImportClient classes={classOptions} />
    </main>
  );
}
