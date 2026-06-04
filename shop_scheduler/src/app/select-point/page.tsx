import { redirect } from "next/navigation";
import { selectActiveZone } from "@/app/actions";
import { AuthScreenShell } from "@/components/AuthScreenShell";
import { requireAuth } from "@/lib/auth";
import { MULTI_ZONE_ENABLED } from "@/lib/multiZoneConfig";
import { getAccessibleZonesForUser } from "@/lib/zoneAccess";
import { cn } from "@/lib/utils";

export default async function SelectPointPage() {
  if (!MULTI_ZONE_ENABLED) redirect("/schedule");

  const user = await requireAuth();
  const zones = await getAccessibleZonesForUser(user);

  return (
    <AuthScreenShell
      title="Выберите торговую точку"
      description="Смены и отчёты привязаны к выбранной точке. Сменить точку можно в шапке — «Сменить точку»."
    >
      {zones.length === 0 ? (
        <p className="text-center text-sm text-muted">
          Нет доступных торговых точек. Обратитесь к администратору.
        </p>
      ) : (
        <ul className="space-y-3">
          {zones.map((zone) => (
            <li key={zone.id}>
              <form action={selectActiveZone.bind(null, zone.id)}>
                <button
                  type="submit"
                  className={cn(
                    "w-full rounded-lg border border-border bg-card p-4 text-left transition-colors",
                    "hover:border-accent hover:bg-accent/5"
                  )}
                >
                  <div className="font-semibold text-foreground">{zone.name}</div>
                  {zone.description ? (
                    <p className="mt-1 text-sm text-muted">{zone.description}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-muted">
                    Часы работы: {zone.dayStartTime}–{zone.dayEndTime}
                  </p>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </AuthScreenShell>
  );
}
