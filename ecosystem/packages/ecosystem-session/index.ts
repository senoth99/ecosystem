import { jwtVerify } from "jose";

export const ECO_COOKIE = "eco_session";

export type EcoSession = {
  userId: string;
  telegramId: string;
  telegramUsername: string;
  displayName: string;
  isSuperAdmin: boolean;
};

export function sessionSecretBytes(): Uint8Array {
  const raw = process.env.SESSION_SECRET?.trim();
  if (!raw || raw.length < 16) throw new Error("SESSION_SECRET missing");
  return new TextEncoder().encode(raw);
}

export async function verifyEcoSession(token: string): Promise<EcoSession | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecretBytes());
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      telegramId: String(payload.telegramId ?? ""),
      telegramUsername: String(payload.telegramUsername ?? ""),
      displayName: String(payload.displayName ?? ""),
      isSuperAdmin: Boolean(payload.isSuperAdmin)
    };
  } catch {
    return null;
  }
}

export function getEcoTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === ECO_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function ecosystemLoginUrl(nextPath?: string): string {
  const base = process.env.ECOSYSTEM_PUBLIC_URL?.trim() || process.env.PUBLIC_BASE_URL?.trim() || "/";
  const url = new URL("/login", base.endsWith("/") ? base : `${base}/`);
  if (nextPath) url.searchParams.set("next", nextPath);
  return url.toString();
}
