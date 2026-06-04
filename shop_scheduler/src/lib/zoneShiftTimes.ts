import { prisma } from "@/lib/prisma";

const DEFAULT_DAY_START = "10:00";
const DEFAULT_DAY_END = "22:00";

export async function getZoneShiftTimes(zoneId: string) {
  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) throw new Error("Точка не найдена");
  const lunchStart = zone.lunchStartTime?.trim() || null;
  const lunchEnd = zone.lunchEndTime?.trim() || null;
  return {
    zoneName: zone.name,
    startTime: zone.dayStartTime?.trim() || DEFAULT_DAY_START,
    endTime: zone.dayEndTime?.trim() || DEFAULT_DAY_END,
    lunchStartTime: lunchStart && lunchEnd ? lunchStart : null,
    lunchEndTime: lunchStart && lunchEnd ? lunchEnd : null
  };
}

export function formatZoneHoursLabel(
  startTime: string,
  endTime: string,
  lunchStartTime?: string | null,
  lunchEndTime?: string | null
): string {
  const base = `${startTime}–${endTime}`;
  if (lunchStartTime && lunchEndTime) return `${base} · обед ${lunchStartTime}–${lunchEndTime}`;
  return base;
}
