import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-profile";
import { AppShell } from "@/components/layout/AppShell";
import { UnitSetupForm } from "./unit-setup-form";

export default async function UnitSetupPage() {
  const profile = await requireProfile();

  if (profile.role !== "unit_coordinator" || profile.unit_scope) {
    redirect("/");
  }

  return (
    <AppShell profile={profile} active="unit-setup" eyebrow="ขั้นตอนเริ่มต้น" title="กรอกข้อมูลหน่วยฝึกอบรม">
      <section className="card" style={{ maxWidth: 680 }}>
        <span className="step on">บันทึกครั้งเดียว</span>
        <p className="footnote" style={{ marginTop: 10 }}>
          บันทึกครั้งนี้จะสร้างหน่วยฝึกอบรมจริงและผูกกับบัญชีนี้ทันที ทำได้เพียงครั้งเดียว
        </p>
        <div style={{ marginTop: 16 }}>
          <UnitSetupForm />
        </div>
      </section>
    </AppShell>
  );
}
