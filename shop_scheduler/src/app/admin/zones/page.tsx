import Link from "next/link";
import { redirect } from "next/navigation";
import { ZoneEditRow } from "@/components/ZoneEditRow";
import { ZoneForm } from "@/components/ZoneForm";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { MULTI_ZONE_ENABLED } from "@/lib/multiZone";
import { prisma } from "@/lib/prisma";

export default async function AdminZonesPage() {
  if (!MULTI_ZONE_ENABLED) redirect("/admin");
  await requireRole([UserRole.SUPER_ADMIN]);
  const zones = await prisma.zone.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Офлайн-точки</h1>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          ← Админка
        </Link>
      </div>
      <p className="text-sm text-muted">Торговые точки: часы работы и доступ сотрудников.</p>
      <ZoneForm />
      <div className="space-y-3">
        {zones.length === 0 ? (
          <p className="text-sm text-muted">Точек пока нет — создайте первую выше.</p>
        ) : (
          zones.map((zone) => <ZoneEditRow key={zone.id} zone={zone} />)
        )}
      </div>
    </div>
  );
}
