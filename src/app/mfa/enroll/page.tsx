import { EnrollClient } from "./enroll-client";
import { AuthShell } from "@/components/layout/AuthShell";

export default function MfaEnrollPage() {
  return (
    <AuthShell title="ตั้งค่า MFA" subtitle="บัญชี Web Master ต้องเปิดใช้งาน MFA ก่อนจึงจะใช้งานระบบต่อได้">
      <EnrollClient />
    </AuthShell>
  );
}
