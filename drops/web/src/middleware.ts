import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  appBasePath,
  ecosystemAuthEnabled,
  ecosystemLoginUrl,
  getEcoTokenFromRequest,
  verifyEcoSession
} from "@/lib/ecosystem-gate";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname.startsWith("/uploads/")
  ) {
    return NextResponse.next();
  }

  if (!ecosystemAuthEnabled()) {
    const auth = request.cookies.get("drops_auth")?.value === "1";
    if (pathname.startsWith("/login")) {
      if (auth) return NextResponse.redirect(new URL("/", request.url));
      return NextResponse.next();
    }
    if (!auth) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  const eco = getEcoTokenFromRequest(request.headers.get("cookie") ?? undefined);
  if (pathname.startsWith("/login")) {
    if (eco && (await verifyEcoSession(eco))) {
      return NextResponse.redirect(new URL(appBasePath() || "/", request.url));
    }
    return NextResponse.redirect(new URL(ecosystemLoginUrl(`${appBasePath()}/`), request.url));
  }

  if (!eco) {
    return NextResponse.redirect(new URL(ecosystemLoginUrl(`${appBasePath()}${pathname}`), request.url));
  }
  const session = await verifyEcoSession(eco);
  if (!session) {
    return NextResponse.redirect(new URL(ecosystemLoginUrl(`${appBasePath()}${pathname}`), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|optimize.gif|uploads/|.*\\.svg$).*)"]
};
