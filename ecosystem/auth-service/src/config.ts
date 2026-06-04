export const COOKIE_NAME = "eco_session";
export const SESSION_TTL_SEC = 60 * 60 * 24 * 14;

export function sessionSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET?.trim();
  if (!raw || raw.length < 16) {
    throw new Error("SESSION_SECRET must be at least 16 characters");
  }
  return new TextEncoder().encode(raw);
}

export function superadminUsernames(): Set<string> {
  const raw =
    process.env.SUPERADMIN_USERNAMES?.trim() ?? "contact_voropaev,ivanvoropaeff";
  return new Set(
    raw
      .split(",")
      .map((s) => s.replace(/^@+/, "").trim().toLowerCase())
      .filter(Boolean)
  );
}

export function cookieOptions() {
  const domain = process.env.COOKIE_DOMAIN?.trim();
  const secure = process.env.COOKIE_SECURE === "true";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SEC,
    ...(domain ? { domain } : {})
  };
}
