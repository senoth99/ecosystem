/**
 * Copy this file to each app's src/lib/ecosystem-gate.ts (keep in sync).
 */
import { jwtVerify } from "jose";

export const ECO_COOKIE = "eco_session";

export type EcoSession = {
  userId: string;
  telegramId: string;
  telegramUsername: string;
  displayName: string;
  isSuperAdmin: boolean;
};

export function ecosystemAuthEnabled(): boolean {
  if (process.env.ECOSYSTEM_AUTH_ENABLED === "false") return false;
  if (process.env.ECOSYSTEM_AUTH_ENABLED === "true") return true;
  return Boolean(process.env.ECOSYSTEM_PUBLIC_URL?.trim());
}

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

export function getEcoTokenFromRequest(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === ECO_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function ecosystemLoginUrl(nextPath?: string): string {
  const base = (process.env.ECOSYSTEM_PUBLIC_URL ?? process.env.PUBLIC_BASE_URL ?? "http://localhost").replace(
    /\/$/,
    ""
  );
  const url = new URL("/login", `${base}/`);
  if (nextPath) url.searchParams.set("next", nextPath);
  return url.toString();
}

export function appBasePath(): string {
  const p = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  return p.endsWith("/") ? p.slice(0, -1) : p;
}
