import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>เข้าสู่ระบบ</h1>
      <p style={{ color: "#666", fontSize: 14 }}>ระบบจัดการหน่วยฝึกอบรม</p>
      {error && (
        <p style={{ color: "crimson", fontSize: 14 }}>
          เข้าสู่ระบบไม่สำเร็จ: {error}
        </p>
      )}
      <form action={signIn} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          อีเมล
          <input name="email" type="email" required style={{ width: "100%" }} />
        </label>
        <label>
          รหัสผ่าน
          <input name="password" type="password" required style={{ width: "100%" }} />
        </label>
        <button type="submit">เข้าสู่ระบบ</button>
      </form>
    </main>
  );
}
