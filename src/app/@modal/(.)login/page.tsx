import { LoginForm } from "@/app/login/login-form";
import { Modal } from "@/components/layout/Modal";
import { AuthCard } from "@/components/layout/AuthCard";
import { CancelBackButton } from "@/components/layout/CancelBackButton";

// Intercepts client-side navigation to /login (e.g. clicking "เข้าสู่ระบบ" from the public
// homepage) and renders it as a floating popup over the current page instead of a full page
// change. A hard navigation/refresh/direct link to /login (including middleware's own
// redirect() for unauthenticated protected pages) still gets the real full page at
// src/app/login/page.tsx -- intercepting routes only apply to in-app client transitions,
// which is exactly right here since there's no page to show "behind" a direct visit.
export default async function LoginModal({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <Modal>
      <AuthCard title="เข้าสู่ระบบ" subtitle="ระบบจัดการหน่วยฝึกอบรม">
        <LoginForm error={error} cancelSlot={<CancelBackButton />} />
      </AuthCard>
    </Modal>
  );
}
