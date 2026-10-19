import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { ROLE_LABEL } from "@/lib/labels";
import { signOut } from "./login/actions";

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
          บัญชีนี้ยังไม่ได้ผูกกับหน่วยฝึกอบรมใด —{" "}
          <Link href="/unit-setup">กรอกข้อมูลหน่วยฝึกอบรม</Link> ก่อนจึงจะใช้งานส่วนอื่นได้
        </p>
      )}

      {profile?.role === "web_master" && (
        <p>
          <Link href="/admin/users">User Management</Link>
        </p>
      )}

      {profile?.role === "unit_coordinator" && profile.unit_scope && (
        <>
          <p>
            <Link href="/unit/profile">โปรไฟล์หน่วยและภาพถ่าย</Link>
          </p>
          <p>
            <Link href="/unit/classes">รุ่นฝึกอบรมและวิทยากร</Link>
          </p>
          <p>
            <Link href="/unit/learners">ผู้เรียน</Link>
          </p>
          <p>
            <Link href="/unit/testing-center">สถานะศูนย์ทดสอบมาตรฐาน</Link>
          </p>
        </>
      )}

      {profile && profile.role !== "executive" && (!pendingUnitSetup) && (
        <p>
          <Link href="/courses">หลักสูตร</Link>
        </p>
      )}

      <form action={signOut}>
        <button type="submit">ออกจากระบบ</button>
      </form>
    </main>
  );
}
