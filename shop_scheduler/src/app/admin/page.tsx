import Link from "next/link";
import { AdminSingleQrDownload } from "@/components/AdminSingleQrDownload";
import { AdminZoneQrList } from "@/components/AdminZoneQrList";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { MULTI_ZONE_ENABLED, ensurePrimaryShopZone } from "@/lib/multiZone";
import { prisma } from "@/lib/prisma";
import { ensureAllActiveZonesHaveCheckInTokens, ensureZoneCheckInToken } from "@/lib/workplaceQr";

export default async function AdminPage() {
  const actor = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  if (MULTI_ZONE_ENABLED) {
    await ensureAllActiveZonesHaveCheckInTokens();
  } else {
    await ensureZoneCheckInToken((await ensurePrimaryShopZone()).id);
  }

  const zones = MULTI_ZONE_ENABLED
    ? await prisma.zone.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true }
      })
    : [];
  const primaryZone = MULTI_ZONE_ENABLED ? null : await ensurePrimaryShopZone();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Админка</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <Link href="/admin/logs" className="card hover:border-accent">
          <span className="font-semibold">Логи</span>
          <p className="mt-1 text-sm text-muted">Журнал действий администраторов</p>
        </Link>
        {actor.role === UserRole.SUPER_ADMIN && MULTI_ZONE_ENABLED ? (
          <Link href="/admin/zones" className="card hover:border-accent">
            <span className="font-semibold">Офлайн-точки</span>
            <p className="mt-1 text-sm text-muted">Магазины, часы работы, активность</p>
          </Link>
        ) : null}
      </div>
      <section className="card space-y-3">
        {MULTI_ZONE_ENABLED ? (
          <>
            <h2 className="text-lg font-semibold">QR прихода по точкам</h2>
            <p className="text-sm text-muted">
              У каждой точки свой QR — распечатайте и повесьте у входа. Сотрудники отмечаются в разделе «Отметить
              приход» (нужна привязка к этой точке).
            </p>
            <AdminZoneQrList zones={zones} />
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">QR прихода</h2>
            <p className="text-sm text-muted">
              Распечатайте QR и повесьте у входа. Сотрудники отмечаются в разделе «Отметить приход».
            </p>
            {primaryZone ? (
              <AdminSingleQrDownload zoneId={primaryZone.id} zoneName={primaryZone.name} />
            ) : (
              <p className="text-sm text-muted">Активная точка не настроена.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
