import { signIn } from "./actions";
import { AuthShell } from "@/components/layout/AuthShell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell title="เข้าสู่ระบบ" subtitle="ระบบจัดการหน่วยฝึกอบรม">
      {error && <p className="notice error">เข้าสู่ระบบไม่สำเร็จ: {error}</p>}
      <form action={signIn} style={{ display: "grid", gap: 14 }}>
        <label>
          <span className="field-label">อีเมล</span>
          <input name="email" type="email" required className="field" />
        </label>
        <label>
          <span className="field-label">รหัสผ่าน</span>
          <input name="password" type="password" required className="field" />
        </label>
        <button type="submit" className="btn primary">
          เข้าสู่ระบบ
        </button>
      </form>
    </AuthShell>
  );
}
