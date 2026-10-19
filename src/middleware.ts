import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

const PUBLIC_PATHS = ["/login"];
const MFA_PATHS = ["/mfa/enroll", "/mfa/verify"];

export async function middleware(request: NextRequest) {
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
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isMfaPath = MFA_PATHS.some((path) => pathname.startsWith(path));

  // §09 enforcement #10 — no endpoint in the system is public, not even "submit training
  // unit info"; it still requires a logged-in (unit_scope=NULL) account, just not this check.
  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // §09 enforcement #8 — MFA (TOTP) is mandatory for Web Master, not just recommended.
  // Checked on every request (not just at login) so an already-open tab can't skip it either.
  if (user && !isMfaPath && !isPublic) {
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
