// EDGE-SAFE — imports only from auth.config.ts; never Prisma, bcryptjs, or @netlify/blobs.
// TODO: Rename to proxy.ts when Next.js stabilizes the new convention.
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth: middleware } = NextAuth(authConfig);

const ROLE_ROUTES: Record<string, string[]> = {
  "/admin":    ["ADMIN"],
  "/sales":    ["SALES", "ADMIN"],
  "/seller":   ["SELLER", "ADMIN"],
  "/employee": ["EMPLOYEE", "ADMIN"],
  "/customer": ["CUSTOMER", "SELLER", "ADMIN"],
};

export default middleware((req) => {
  const { pathname } = req.nextUrl;
  const roles: string[] = (req.auth?.user as { roles?: string[] })?.roles ?? [];

  // Unauthenticated: redirect to login, preserving the intended destination
  if (!req.auth) {
    const loginUrl = new URL(
      `/login?callbackUrl=${encodeURIComponent(pathname)}`,
      req.url,
    );
    return NextResponse.redirect(loginUrl);
  }

  for (const [prefix, allowed] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!roles.some((r) => allowed.includes(r))) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  // (shop)/ and (auth)/ routes are intentionally excluded from the matcher.
  matcher: [
    "/admin/:path*",
    "/sales/:path*",
    "/seller/:path*",
    "/employee/:path*",
    "/customer/:path*",
  ],
};
