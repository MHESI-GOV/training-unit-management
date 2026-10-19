import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VerifyForm } from "./verify-form";

export default async function MfaVerifyPage() {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];

  if (!factor) {
    redirect("/mfa/enroll");
  }

  return (
    <main style={{ maxWidth: 420, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>ยืนยันตัวตนสองชั้น</h1>
      <p style={{ color: "#666", fontSize: 14 }}>กรอกรหัสจากแอป Authenticator เพื่อเข้าสู่ระบบ</p>
      <VerifyForm factorId={factor.id} />
    </main>
  );
}
