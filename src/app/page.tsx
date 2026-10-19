import { getCurrentProfile } from "@/lib/auth/get-profile";
import { signOut } from "./login/actions";

const ROLE_LABEL: Record<string, string> = {
  web_master: "Web Master",
  central_staff: "Central Staff",
  unit_coordinator: "Unit Coordinator",
  executive: "Executive",
};

export default async function Home() {
  const { email, profile } = await getCurrentProfile();

  const pendingUnitSetup = profile?.role === "unit_coordinator" && !profile.unit_scope;

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>ระบบจัดการหน่วยฝึกอบรม</h1>
      <p>
        เข้าสู่ระบบในนาม <strong>{email}</strong>
        {profile && <> — บทบาท: {ROLE_LABEL[profile.role] ?? profile.role}</>}
      </p>

      {!profile && (
        <p style={{ color: "crimson" }}>
          ไม่พบข้อมูลโปรไฟล์ผู้ใช้ — ติดต่อ Web Master
        </p>
      )}

      {pendingUnitSetup && (
        <p>
          บัญชีนี้ยังไม่ได้ผูกกับหน่วยฝึกอบรมใด — ต้องกรอกข้อมูลหน่วยฝึกอบรมก่อนจึงจะใช้งานส่วนอื่นได้
          (หน้านี้ยังไม่ได้สร้าง — M4)
        </p>
      )}

      <form action={signOut}>
        <button type="submit">ออกจากระบบ</button>
      </form>
    </main>
  );
}
