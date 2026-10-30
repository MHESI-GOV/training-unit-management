import { signIn } from "./actions";
import { PasswordField } from "@/components/ui/PasswordField";

export function LoginForm({
  error,
  cancelSlot,
}: {
  error?: string;
  cancelSlot: React.ReactNode;
}) {
  return (
    <>
      {error && <p className="notice error">เข้าสู่ระบบไม่สำเร็จ: {error}</p>}
      <form action={signIn} style={{ display: "grid", gap: 14 }}>
        <label>
          <span className="field-label">อีเมล</span>
          <input name="email" type="email" required className="field" />
        </label>
        <label>
          <span className="field-label">รหัสผ่าน</span>
          <PasswordField name="password" required autoComplete="current-password" />
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn primary" style={{ flex: 1 }}>
            เข้าสู่ระบบ
          </button>
          {cancelSlot}
        </div>
      </form>
    </>
  );
}
