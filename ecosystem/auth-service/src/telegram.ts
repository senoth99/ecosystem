import { createHmac, createHash, randomBytes } from "node:crypto";

export type TgUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

function parseInitData(initData: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  const entries = Array.from(params.entries()).filter(([k]) => k !== "hash");
  const dataCheckString = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  return { hash, dataCheckString, params };
}

export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  const parsed = parseInitData(initData);
  if (!parsed) return false;
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const signature = createHmac("sha256", secret).update(parsed.dataCheckString).digest("hex");
  return signature === parsed.hash;
}

export function parseUserFromInitData(initData: string): TgUser | null {
  const parsed = parseInitData(initData);
  if (!parsed) return null;
  const userRaw = parsed.params.get("user");
  if (!userRaw) return null;
  try {
    const u = JSON.parse(userRaw) as TgUser;
    if (typeof u.id !== "number") return null;
    return u;
  } catch {
    return null;
  }
}

export function displayName(u: TgUser): string {
  const n = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return n || (u.username ? `@${u.username}` : `tg_${u.id}`);
}

export function normalizeUsername(u: TgUser): string {
  return (u.username ?? "").replace(/^@+/, "").trim().toLowerCase();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken(): string {
  return randomBytes(24).toString("hex");
}
