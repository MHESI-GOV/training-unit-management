import { EnrollClient } from "./enroll-client";

export default function MfaEnrollPage() {
  return (
    <main style={{ maxWidth: 420, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>ตั้งค่า MFA (บังคับสำหรับ Web Master)</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        บัญชี Web Master ต้องเปิดใช้งาน MFA ก่อนจึงจะใช้งานระบบต่อได้
      </p>
      <EnrollClient />
    </main>
  );
}
