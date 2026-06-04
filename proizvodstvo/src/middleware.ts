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
  if (!eco) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(ecosystemLoginUrl(`${appBasePath()}${pathname}`));
  }
  const session = await verifyEcoSession(eco);
  if (!session) {
    return NextResponse.redirect(ecosystemLoginUrl(`${appBasePath()}${pathname}`));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
