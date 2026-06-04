import type { Zone } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export { MULTI_ZONE_ENABLED } from "@/lib/multiZoneConfig";

export async function getPrimaryShopZone(): Promise<Zone | null> {
  return prisma.zone.findFirst({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
}

/** Режим одного магазина: гарантирует активную точку (иначе /schedule ↔ /select-point). */
export async function ensurePrimaryShopZone(): Promise<Zone> {
  const existing = await getPrimaryShopZone();
  if (existing) return existing;

  return prisma.zone.create({
    data: {
      name: "Шоурум на флаконе",
      sortOrder: 1,
      dayStartTime: "12:00",
      dayEndTime: "21:00",
      lunchStartTime: "15:00",
      lunchEndTime: "16:00",
      isActive: true,
      checkInQrToken: randomBytes(16).toString("hex")
    }
  });
}
