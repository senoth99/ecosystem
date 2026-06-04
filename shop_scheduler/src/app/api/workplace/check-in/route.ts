import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { notifyAdminsShiftArrival } from "@/lib/notifyAdmins";
import { prisma } from "@/lib/prisma";
import { MULTI_ZONE_ENABLED } from "@/lib/multiZone";
import { resolveZoneByCheckInToken } from "@/lib/workplaceQr";
import { getAccessibleZonesForUser } from "@/lib/zoneAccess";

async function userCanCheckInAtZone(
  user: { id: string; role: string },
  zoneId: string
): Promise<boolean> {
  if (!MULTI_ZONE_ENABLED) return true;
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) return true;
  const accessible = await getAccessibleZonesForUser(user);
  return accessible.some((z) => z.id === zoneId);
}

export async function POST(req: Request) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (e) {
    console.error("[api/workplace/check-in POST] session", e);
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ error: "invalid_token" }, { status: 400 });

  try {
    const zone = await resolveZoneByCheckInToken(token);
    if (!zone) {
      return NextResponse.json({ error: "invalid_token" }, { status: 403 });
    }

    const allowed = await userCanCheckInAtZone(user, zone.id);
    if (!allowed) {
      return NextResponse.json({ error: "forbidden_zone" }, { status: 403 });
    }

    const arrivedAt = new Date();
    const existing = await prisma.workplaceArrival.findUnique({
      where: { userId: user.id },
      select: { id: true }
    });

    if (existing) {
      await prisma.workplaceArrival.update({
        where: { userId: user.id },
        data: { arrivedAt, zoneId: zone.id }
      });
    } else {
      await prisma.workplaceArrival.create({
        data: { userId: user.id, arrivedAt, zoneId: zone.id }
      });
    }

    await notifyAdminsShiftArrival({
      employeeName: user.name,
      arrivedAt,
      zoneName: zone.name
    });

    return NextResponse.json({
      ok: true,
      updated: Boolean(existing),
      arrivedAt: arrivedAt.toISOString(),
      zoneName: zone.name
    });
  } catch (e) {
    console.error("[api/workplace/check-in POST] Prisma error:", e);
    return NextResponse.json({ error: "check_in_unavailable" }, { status: 503 });
  }
}
