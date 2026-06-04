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
  if (pathname.startsWith("/login")) {
    return NextResponse.redirect(ecosystemLoginUrl(`${appBasePath()}/integrations`));
  }
  const eco = getEcoTokenFromRequest(req.headers.get("cookie") ?? undefined);
  if (!eco) {
    return NextResponse.redirect(ecosystemLoginUrl(`${appBasePath()}${pathname}`));
  }
  const session = await verifyEcoSession(eco);
  if (!session) {
    return NextResponse.redirect(ecosystemLoginUrl(`${appBasePath()}${pathname}`));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next).*)"]
};
