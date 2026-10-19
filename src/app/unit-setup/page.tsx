import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-profile";
import { UnitSetupForm } from "./unit-setup-form";

export default async function UnitSetupPage() {
  const profile = await requireProfile();

  if (profile.role !== "unit_coordinator" || profile.unit_scope) {
    redirect("/");
  }

  return (
    <main style={{ maxWidth: 480, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>กรอกข้อมูลหน่วยฝึกอบรม</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        บันทึกครั้งนี้จะสร้างหน่วยฝึกอบรมจริงและผูกกับบัญชีนี้ทันที ทำได้เพียงครั้งเดียว
      </p>
      <UnitSetupForm />
    </main>
  );
}
