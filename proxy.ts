import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic gate only (cookie presence). The real checks live in
 * lib/session.ts (requireOnboarded) and in every API route (apiUser).
 */
export function proxy(req: NextRequest) {
  const authed = !!getSessionCookie(req);
  const { pathname, search } = req.nextUrl;
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";

  if (!authed && !isAuthPage) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (authed && isAuthPage) return NextResponse.redirect(new URL("/app", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/onboarding", "/sign-in", "/sign-up"] };
