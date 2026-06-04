import Link from "next/link";
import { ChevronRight, HandCoins, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { ManagerTodayBrigades } from "@/components/ManagerTodayBrigades";
import { getZoneShiftTimes } from "@/lib/zoneShiftTimes";
import { requireAuthWithZone } from "@/lib/auth";
import { canOpenManagerPanel } from "@/lib/managerPanel";
import { catchDb } from "@/lib/dbBoundary";
import { ShiftStatus } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { prismaUserShiftBoardSelect } from "@/lib/prismaSafeUserInclude";
import { formatDateRu, getAppISODay, getWeekStart, weekDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ManagerPanelPage() {
  const { user, zone } = await requireAuthWithZone();
  if (!canOpenManagerPanel(user)) redirect("/schedule");

  const zoneId = zone.id;
  const { startTime, endTime, zoneName } = await getZoneShiftTimes(zoneId);

  const today = new Date();
  const weekStart = getWeekStart(today);
  const dayOfWeek = getAppISODay(today);
  const weekdayLabel = weekDays.find((d) => d.index === dayOfWeek)?.name ?? "Сегодня";
  const dateLabel = formatDateRu(today, "dd.MM.yyyy");

  const todayLoaded = await catchDb("manager/today-shifts", async () =>
    prisma.shift.findMany({
      where: {
        zoneId,
        weekStartDate: weekStart,
        dayOfWeek,
        startTime,
        endTime,
        status: { not: ShiftStatus.CANCELLED }
      },
      include: { user: { select: prismaUserShiftBoardSelect }, zone: true },
      orderBy: { user: { name: "asc" } }
    })
  );

  const todayShifts =
    todayLoaded.ok
      ? todayLoaded.data.map((s) => ({
          id: s.id,
          user: {
            name: s.user.name,
            color: s.user.color,
            telegramPhotoUrl: s.user.telegramPhotoUrl ?? null
          }
        }))
      : [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold uppercase tracking-display sm:text-3xl">Панель руководителя</h1>

      {todayLoaded.ok ? (
        <ManagerTodayBrigades
          zoneName={zoneName}
          startTime={startTime}
          endTime={endTime}
          shifts={todayShifts}
          weekdayLabel={weekdayLabel}
          dateLabel={dateLabel}
        />
      ) : (
        <p className="text-sm text-muted">Не удалось загрузить смены на сегодня. Обновите страницу позже.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/manager/employees"
          className="card flex min-h-[52px] touch-manipulation items-center gap-3 transition-colors hover:bg-foreground/[0.04]"
          aria-label="Сотрудники"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-transparent">
            <Users className="h-5 w-5 text-muted" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-tight">Сотрудники</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        </Link>

        <Link
          href="/manager/payouts"
          className="card flex min-h-[52px] touch-manipulation items-center gap-3 transition-colors hover:bg-foreground/[0.04]"
          aria-label="Выплаты"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-transparent">
            <HandCoins className="h-5 w-5 text-muted" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-tight">Выплаты</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
