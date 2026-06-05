import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { ECO_COOKIE, ecosystemLoginUrl, sessionSecretBytes } from "./index.js";

export type EcosystemGateOptions = {
  appSlug: string;
  /** Paths that skip auth (static assets handled separately) */
  publicPaths?: string[];
  /** Skip matcher for api routes */
  skipApi?: boolean;
};

function loginRedirect(req: NextRequest, basePath: string): NextResponse {
  const next = `${basePath}${req.nextUrl.pathname}${req.nextUrl.search}`;
  return NextResponse.redirect(new URL(ecosystemLoginUrl(next), req.url));
}

export function createEcosystemMiddleware(opts: EcosystemGateOptions) {
  const publicPaths = [
    "/access-denied",
    ...(opts.publicPaths ?? [])
  ];

  return async function middleware(req: NextRequest): Promise<NextResponse> {
    const { pathname } = req.nextUrl;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";

    if (
      pathname.startsWith("/_next") ||
      pathname.includes(".") ||
      pathname.startsWith("/.well-known")
    ) {
      return NextResponse.next();
    }

    if (publicPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    const eco = req.cookies.get(ECO_COOKIE)?.value;
    if (!eco) {
      return loginRedirect(req, basePath);
    }

    try {
      const { payload } = await jwtVerify(eco, sessionSecretBytes());
      if (!payload.isSuperAdmin && opts.appSlug) {
        // App-level check done in layout/API via AUTH_SERVICE; middleware only ensures login
      }
      const headers = new Headers(req.headers);
      headers.set("x-eco-user-id", String(payload.userId ?? ""));
      headers.set("x-eco-superadmin", payload.isSuperAdmin ? "1" : "0");
      return NextResponse.next({ request: { headers } });
    } catch {
      return loginRedirect(req, basePath);
    }
  };
}
