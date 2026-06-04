import { AUTH_COOKIE, isValidCredentials } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { login, password } = await req.json();

  if (!isValidCredentials(login, password)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
