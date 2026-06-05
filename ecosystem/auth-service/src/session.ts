import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, SESSION_TTL_SEC, sessionSecret } from "./config.js";

export type EcoSession = {
  userId: string;
  telegramId: string;
  telegramUsername: string;
  displayName: string;
  isSuperAdmin: boolean;
};

export async function signSession(payload: EcoSession): Promise<string> {
  return new SignJWT({ ...payload, sub: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(sessionSecret());
}

export async function verifySession(token: string): Promise<EcoSession | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.telegramId !== "string" ||
      typeof payload.isSuperAdmin !== "boolean"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      telegramId: payload.telegramId,
      telegramUsername: String(payload.telegramUsername ?? ""),
      displayName: String(payload.displayName ?? ""),
      isSuperAdmin: payload.isSuperAdmin
    };
  } catch {
    return null;
  }
}

export function parseCookie(header: string | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionCookieHeader(token: string, forwardedProto?: string): string {
  const opts = cookieOptions(forwardedProto);
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    "HttpOnly",
    `SameSite=${opts.sameSite}`
  ];
  if (opts.secure) parts.push("Secure");
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  return parts.join("; ");
}

export function cookieOptions(forwardedProtoHeader?: string) {
  const domain = process.env.COOKIE_DOMAIN?.trim();
  let secure: boolean;
  if (forwardedProtoHeader === "http") secure = false;
  else if (forwardedProtoHeader === "https") secure = true;
  else secure = process.env.COOKIE_SECURE === "true";
  return {
    path: "/",
    maxAge: SESSION_TTL_SEC,
    sameSite: "lax" as const,
    secure,
    domain
  };
}

export function clearSessionCookieHeader(forwardedProtoHeader?: string): string {
  const opts = cookieOptions(forwardedProtoHeader);
  const parts = [
    `${COOKIE_NAME}=`,
    `Path=${opts.path}`,
    "Max-Age=0",
    "HttpOnly",
    `SameSite=${opts.sameSite}`
  ];
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  return parts.join("; ");
}
