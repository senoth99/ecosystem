import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/api/eco"];

function sessionSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET?.trim();
  if (!raw || raw.length < 16) return new Uint8Array(0);
  return new TextEncoder().encode(raw);
}

async function verifyEcoSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return (
      typeof payload.userId === "string" &&
      typeof payload.telegramId === "string" &&
      typeof payload.isSuperAdmin === "boolean"
    );
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PUBLIC.some((p) => path.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("eco_session")?.value;

  if (path.startsWith("/login")) {
    if (token && (await verifyEcoSession(token))) {
      const next = req.nextUrl.searchParams.get("next") ?? "/";
      const dest = next.startsWith("/") ? next : "/";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  if (!token || !(await verifyEcoSession(token))) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
