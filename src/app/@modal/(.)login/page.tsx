import { Modal } from "@/components/layout/Modal";
import { LoginModalFlow } from "./login-modal-flow";

// Intercepts client-side navigation to /login (e.g. clicking "เข้าสู่ระบบ" from the public
// homepage) and renders it as a floating popup over the current page instead of a full page
// change. A hard navigation/refresh/direct link to /login (including middleware's own
// redirect() for unauthenticated protected pages) still gets the real full page at
// src/app/login/page.tsx -- intercepting routes only apply to in-app client transitions,
// which is exactly right here since there's no page to show "behind" a direct visit.
//
// LoginModalFlow runs the whole login -> (Web Master only) MFA enroll/verify sequence entirely
// client-side inside this popup, then hard-navigates to "/" once. See its long comment for why
// everything here must be client-side (no server action) to avoid the "/" background
// revalidation yanking a Web Master out to a full-page /mfa/* mid-flow.
export default function LoginModal() {
  return (
    <Modal>
      <LoginModalFlow />
    </Modal>
  );
}
