import { randomBytes } from "node:crypto";
import { resolveAppPublicBaseUrl } from "@/lib/appUrl";
import { prisma } from "@/lib/prisma";

export function generateZoneCheckInToken(): string {
  return randomBytes(16).toString("hex");
}

/** Стабильный токен QR для точки; создаётся при первом запросе. */
export async function ensureZoneCheckInToken(zoneId: string): Promise<string> {
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { checkInQrToken: true, isActive: true }
  });
  if (!zone) throw new Error("Точка не найдена");
  if (zone.checkInQrToken?.trim()) return zone.checkInQrToken.trim();

  const token = generateZoneCheckInToken();
  await prisma.zone.update({
    where: { id: zoneId },
    data: { checkInQrToken: token }
  });
  return token;
}

export async function ensureAllActiveZonesHaveCheckInTokens(): Promise<void> {
  const zones = await prisma.zone.findMany({
    where: { isActive: true, OR: [{ checkInQrToken: null }, { checkInQrToken: "" }] },
    select: { id: true }
  });
  for (const z of zones) {
    await ensureZoneCheckInToken(z.id);
  }
}

export function getZoneCheckInUrl(token: string): string {
  const base = resolveAppPublicBaseUrl();
  return `${base}/check-in?k=${encodeURIComponent(token)}`;
}

export async function resolveZoneByCheckInToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return null;
  return prisma.zone.findFirst({
    where: { checkInQrToken: trimmed, isActive: true },
    select: { id: true, name: true }
  });
}
