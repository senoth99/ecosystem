import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, SESSION_TTL_SEC, sessionSecret } from "./config.js";

export type EcoSession = {
  userId: string;
  telegramId: string;
  telegramUsername: string;
  displayName: string;
  isSuperAdmin: boolean;
};

export type CookieRequestContext = {
  proto?: string;
  host?: string;
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

function isIpHost(host: string): boolean {
  if (host.startsWith("[")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":") && !host.includes(".");
}

function resolveCookieDomain(host?: string): string | undefined {
  const configured = process.env.COOKIE_DOMAIN?.trim();
  if (!host || isIpHost(host)) return undefined;
  if (!configured) return undefined;
  const bare = configured.startsWith(".") ? configured.slice(1) : configured;
  if (host === bare || host.endsWith(`.${bare}`)) {
    return configured.startsWith(".") ? configured : `.${bare}`;
  }
  return undefined;
}

export function cookieOptions(ctx: CookieRequestContext = {}) {
  let secure: boolean;
  if (ctx.proto === "http") secure = false;
  else if (ctx.proto === "https") secure = true;
  else secure = process.env.COOKIE_SECURE === "true";
  return {
    path: "/",
    maxAge: SESSION_TTL_SEC,
    sameSite: "lax" as const,
    secure,
    domain: resolveCookieDomain(ctx.host)
  };
}

export function sessionCookieHeader(token: string, ctx: CookieRequestContext = {}): string {
  const opts = cookieOptions(ctx);
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

export function clearSessionCookieHeader(ctx: CookieRequestContext = {}): string {
  const opts = cookieOptions(ctx);
  const parts = [
    `${COOKIE_NAME}=`,
    `Path=${opts.path}`,
    "Max-Age=0",
    "HttpOnly",
    `SameSite=${opts.sameSite}`
  ];
  if (opts.secure) parts.push("Secure");
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  return parts.join("; ");
}

export function cookieContextFromRequest(req?: {
  headers: Record<string, string | string[] | undefined>;
}): CookieRequestContext {
  const protoRaw = req?.headers["x-forwarded-proto"];
  const protoVal = Array.isArray(protoRaw) ? protoRaw[0] : protoRaw;
  const proto = typeof protoVal === "string" ? protoVal.split(",")[0]?.trim() : undefined;

  const hostRaw = req?.headers["x-forwarded-host"] ?? req?.headers.host;
  const hostVal = Array.isArray(hostRaw) ? hostRaw[0] : hostRaw;
  const host =
    typeof hostVal === "string" ? hostVal.split(",")[0]?.trim().split(":")[0]?.trim() : undefined;

  return { proto, host };
}
