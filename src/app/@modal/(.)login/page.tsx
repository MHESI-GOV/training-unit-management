import { Modal } from "@/components/layout/Modal";
import { LoginModalFlow } from "./login-modal-flow";

// Intercepts client-side navigation to /login (e.g. clicking "เข้าสู่ระบบ" from the public
// homepage) and renders it as a floating popup over the current page instead of a full page
// change. A hard navigation/refresh/direct link to /login (including middleware's own
// redirect() for unauthenticated protected pages) still gets the real full page at
// src/app/login/page.tsx -- intercepting routes only apply to in-app client transitions,
// which is exactly right here since there's no page to show "behind" a direct visit.
//
// The Web Master MFA step (enroll/verify) happens *inside* LoginModalFlow's own client state,
// not as a further route -- a dedicated @modal/(.)mfa/* pair was tried first and removed, since
// middleware's redirect() after a plain signIn() breaks route interception (confirmed by
// testing), so a separate MFA route would just fall back to a full page anyway.
export default function LoginModal() {
  return (
    <Modal>
      <LoginModalFlow />
    </Modal>
  );
}
