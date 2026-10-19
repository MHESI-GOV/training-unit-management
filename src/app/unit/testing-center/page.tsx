import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { ASSESSMENT_STANDARD_LABEL, TESTING_CENTER_STATUS_LABEL } from "@/lib/labels";
import { StatusForm } from "./status-form";

export default async function TestingCenterPage() {
  const profile = await requireProfile();
  if (profile.role !== "unit_coordinator" || !profile.unit_scope) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: statuses } = await supabase
    .from("testing_center_statuses")
    .select("standard_type, status, evidence_ref, updated_at")
    .eq("unit_id", profile.unit_scope);

  return (
    <main style={{ maxWidth: 480, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>สถานะศูนย์ทดสอบมาตรฐาน</h1>
      <ul>
        {(statuses ?? []).map((s) => (
          <li key={s.standard_type}>
            {ASSESSMENT_STANDARD_LABEL[s.standard_type] ?? s.standard_type} —{" "}
            {TESTING_CENTER_STATUS_LABEL[s.status] ?? s.status}
          </li>
        ))}
        {(statuses ?? []).length === 0 && <li>ยังไม่มีข้อมูล</li>}
      </ul>
      <h2>อัปเดตสถานะ</h2>
      <StatusForm />
    </main>
  );
}
