import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { DayScheduleBoard } from "@/components/DayScheduleBoard";
import { WeekModeSwitch } from "@/components/WeekModeSwitch";
import { formatZoneHoursLabel, getZoneShiftTimes } from "@/lib/zoneShiftTimes";
import { requireAuthWithZone } from "@/lib/auth";
import { canOpenManagerPanel } from "@/lib/managerPanel";
import { catchDb } from "@/lib/dbBoundary";
import { prisma } from "@/lib/prisma";
import { prismaUserShiftBoardSelect } from "@/lib/prismaSafeUserInclude";
import { DAY_SLOTS } from "@/lib/scheduleDays";
import { getWeekStart } from "@/lib/utils";
import { addDays } from "date-fns";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { user, zone } = await requireAuthWithZone();
  const zoneId = zone.id;
  const params = await searchParams;
  const weekMode: "current" | "next" = params.week === "next" ? "next" : "current";
  const currentWeekStart = getWeekStart(new Date());
  const nextWeekStart = addDays(currentWeekStart, 7);
  const weekStartDate = weekMode === "next" ? nextWeekStart : currentWeekStart;
  const canManageSchedule = canOpenManagerPanel(user);
  const { startTime, endTime, lunchStartTime, lunchEndTime } = await getZoneShiftTimes(zoneId);
  const hoursLabel = formatZoneHoursLabel(startTime, endTime, lunchStartTime, lunchEndTime);

  const shiftsLoaded = await catchDb("schedule/shifts", () =>
    prisma.shift.findMany({
      where: { weekStartDate, zoneId },
      include: { user: { select: prismaUserShiftBoardSelect }, zone: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    })
  );
  if (!shiftsLoaded.ok) return <ServiceUnavailable scope="schedule/shifts" />;

  const employeesLoaded = canManageSchedule
    ? await catchDb("schedule/employees", () =>
        prisma.user.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            color: true,
            telegramPhotoUrl: true
          }
        })
      )
    : ({ ok: true as const, data: [] });

  try {
    const shifts = shiftsLoaded.data;
    const assignableEmployees = employeesLoaded.ok ? employeesLoaded.data : [];
    const boardShifts = shifts
      .filter((s) => s.startTime === startTime && s.endTime === endTime)
      .map((s) => ({
        id: s.id,
        userId: s.userId,
        dayOfWeek: s.dayOfWeek,
        zoneId: s.zoneId,
        startTime: s.startTime,
        endTime: s.endTime,
        user: {
          id: s.user.id,
          name: s.user.name,
          color: s.user.color,
          telegramPhotoUrl: s.user.telegramPhotoUrl ?? null
        }
      }));

    return (
      <div className="space-y-4">
        <WeekModeSwitch
          mode={weekMode}
          currentWeekStartIso={currentWeekStart.toISOString()}
          nextWeekStartIso={nextWeekStart.toISOString()}
        />
        <DayScheduleBoard
          days={DAY_SLOTS}
          zoneId={zoneId}
          zoneName={zone.name}
          startTime={startTime}
          endTime={endTime}
          hoursLabel={hoursLabel}
          shifts={boardShifts}
          currentUserId={user.id}
          weekStartDateIso={weekStartDate.toISOString()}
          weekMode={weekMode}
          canManageSchedule={canManageSchedule}
          assignableEmployees={assignableEmployees.map((u) => ({
            id: u.id,
            name: u.name,
            color: u.color,
            telegramPhotoUrl: u.telegramPhotoUrl ?? null
          }))}
        />
      </div>
    );
  } catch (e) {
    console.error("[schedule/page render]", e);
    return <ServiceUnavailable scope="schedule" />;
  }
}
