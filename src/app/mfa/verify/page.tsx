import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VerifyForm } from "./verify-form";
import { AuthShell } from "@/components/layout/AuthShell";

export default async function MfaVerifyPage() {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];

  if (!factor) {
    redirect("/mfa/enroll");
  }

  return (
    <AuthShell title="ยืนยันตัวตนสองชั้น" subtitle="กรอกรหัสจากแอป Authenticator เพื่อเข้าสู่ระบบ">
      <VerifyForm factorId={factor.id} />
    </AuthShell>
  );
}
