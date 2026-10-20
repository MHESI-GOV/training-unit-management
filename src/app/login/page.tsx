import Link from "next/link";
import { AuthShell } from "@/components/layout/AuthShell";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell title="เข้าสู่ระบบ" subtitle="ระบบจัดการหน่วยฝึกอบรม">
      <LoginForm
        error={error}
        cancelSlot={
          <Link href="/" className="btn secondary">
            ยกเลิก
          </Link>
        }
      />
    </AuthShell>
  );
}
