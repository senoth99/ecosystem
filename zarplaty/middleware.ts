import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  appBasePath,
  ecosystemAuthEnabled,
  ecosystemLoginUrl,
  getEcoTokenFromRequest,
  verifyEcoSession
} from "./lib/ecosystem-gate";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/logo")) {
    return NextResponse.next();
  }

  if (!ecosystemAuthEnabled()) {
    const AUTH_COOKIE = "zarplaty-auth";
    const auth = request.cookies.get(AUTH_COOKIE)?.value === "ok";
    if (pathname.startsWith("/api/login")) return NextResponse.next();
    if (pathname.startsWith("/api") && !auth) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!auth && pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL(ecosystemLoginUrl(`${appBasePath()}/employees`), request.url));
  }

  const eco = getEcoTokenFromRequest(request.headers.get("cookie") ?? undefined);
  if (!eco) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL(ecosystemLoginUrl(`${appBasePath()}${pathname}`), request.url));
  }
  const session = await verifyEcoSession(eco);
  if (!session) {
    return NextResponse.redirect(new URL(ecosystemLoginUrl(`${appBasePath()}${pathname}`), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!favicon.ico).*)"]
};
