import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic redirects only: this checks that a session cookie exists, not that
// it's valid. Pages enforce access with requireUser()/requireAdmin().
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";

  if (isAuthPage) {
    return hasSession
      ? NextResponse.redirect(new URL("/account", request.url))
      : NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/sign-in", "/sign-up"],
};
