import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

const PUBLIC_PATHS = ["/login"];
// Exact match only -- "/" must not use startsWith, since every path starts with "/".
const PUBLIC_EXACT_PATHS = ["/"];
const MFA_PATHS = ["/mfa/enroll", "/mfa/verify"];
// Vercel Cron calls this with no browser session and no cookies at all -- it authenticates
// itself via the CRON_SECRET bearer token checked inside the route handler, not via the
// Supabase session this middleware otherwise requires everywhere else.
const CRON_PATHS = ["/api/cron/"];

export async function middleware(request: NextRequest) {
  if (CRON_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.some((path) => pathname.startsWith(path)) || PUBLIC_EXACT_PATHS.includes(pathname);
  const isMfaPath = MFA_PATHS.some((path) => pathname.startsWith(path));

  // "/" is the one deliberate exception to §09 enforcement #10 (added 2026-10-20): the
  // dashboard is now the public home page, showing the same project-wide, cell-suppressed
  // KPI view as Executive (get_dashboard_kpis treats a null role like 'executive'). Every
  // other endpoint, including "submit training unit info", still requires a logged-in
  // (unit_scope=NULL) account.
  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // §09 enforcement #8 — MFA (TOTP) is mandatory for Web Master, not just recommended.
  // Checked on every request (not just at login) so an already-open tab can't skip it either.
  // Deliberately does NOT exempt isPublic paths -- "/" being public-to-anonymous-visitors must
  // never also mean "exempt from MFA for a logged-in Web Master who happens to land there" (a
  // real bug caught during the 2026-10-20 redesign: a Web Master mid-AAL1 could sit on the new
  // public home page with the full sidebar + KPI data visible, never forced through /mfa/verify,
  // simply because "/" was in PUBLIC_PATHS for the *unauthenticated* redirect check above).
  if (user && !isMfaPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "web_master") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedTotp = (factors?.totp?.length ?? 0) > 0;

      if (!hasVerifiedTotp) {
        const url = request.nextUrl.clone();
        url.pathname = "/mfa/enroll";
        return NextResponse.redirect(url);
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.currentLevel !== aal.nextLevel) {
        const url = request.nextUrl.clone();
        url.pathname = "/mfa/verify";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
