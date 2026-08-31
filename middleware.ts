import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { OPS_SESSION_COOKIE, isOpsProtectedPath, isOpsPublicPath, opsAuthEnabled, opsSessionValid } from "@/lib/ops-auth";

export function middleware(request: NextRequest) {
  if (!opsAuthEnabled()) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (!isOpsProtectedPath(pathname) || isOpsPublicPath(pathname)) return NextResponse.next();
  if (opsSessionValid(request.cookies.get(OPS_SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/ops")) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const login = request.nextUrl.clone();
  login.pathname = "/ops/login";
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/ops", "/ops/:path*", "/api/ops/:path*"],
};
