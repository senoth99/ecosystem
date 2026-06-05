import { NextRequest, NextResponse } from "next/server";
import {
  appBasePath,
  ecosystemAuthEnabled,
  ecosystemLoginUrl,
  getEcoTokenFromRequest,
  verifyEcoSession
} from "@/lib/ecosystem-gate";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }
  if (!ecosystemAuthEnabled()) return NextResponse.next();
  const eco = getEcoTokenFromRequest(req.headers.get("cookie") ?? undefined);
  if (pathname.startsWith("/login")) {
    if (eco && (await verifyEcoSession(eco))) {
      return NextResponse.redirect(new URL(appBasePath() || "/", req.url));
    }
    return NextResponse.redirect(new URL(ecosystemLoginUrl(`${appBasePath()}/integrations`), req.url));
  }
  if (!eco) {
    return NextResponse.redirect(new URL(ecosystemLoginUrl(`${appBasePath()}${pathname}`), req.url));
  }
  const session = await verifyEcoSession(eco);
  if (!session) {
    return NextResponse.redirect(new URL(ecosystemLoginUrl(`${appBasePath()}${pathname}`), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next).*)"]
};
