import { LoginForm } from "@/app/login/login-form";
import { Modal } from "@/components/layout/Modal";
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
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        <p className="pill study">หนึ่งหมู่บ้าน หนึ่งเชฟอาหารไทย</p>
        <h1 className="page-title" style={{ marginTop: 12 }}>
          เข้าสู่ระบบ
        </h1>
        <p className="footnote" style={{ marginTop: 6 }}>
          ระบบจัดการหน่วยฝึกอบรม
        </p>
        <div style={{ marginTop: 20 }}>
          <LoginForm error={error} cancelSlot={<CancelBackButton />} />
        </div>
      </div>
    </Modal>
  );
}
