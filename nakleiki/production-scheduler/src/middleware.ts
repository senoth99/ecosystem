import { NextRequest, NextResponse } from "next/server";
import {
  appBasePath,
  ecosystemAuthEnabled,
  ecosystemLoginUrl,
  getEcoTokenFromRequest,
  verifyEcoSession
} from "@/lib/ecosystem-gate";

const PUBLIC_PATHS = ["/access-denied"];

function redirectLogin(req: NextRequest): NextResponse {
  const next = `${appBasePath()}${req.nextUrl.pathname}${req.nextUrl.search}`;
  return NextResponse.redirect(new URL(ecosystemLoginUrl(next), req.url));
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  if (pathname.startsWith("/_next") || pathname.includes(".") || pathname.startsWith("/.well-known")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (!ecosystemAuthEnabled()) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  const eco = getEcoTokenFromRequest(req.headers.get("cookie") ?? undefined);
  if (!eco) return redirectLogin(req);
  const session = await verifyEcoSession(eco);
  if (!session) return redirectLogin(req);
  requestHeaders.set("x-eco-user-id", session.userId);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next).*)"]
};
