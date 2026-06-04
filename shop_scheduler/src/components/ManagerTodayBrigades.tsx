"use client";

import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

export type ManagerTodayShift = {
  id: string;
  user: { name: string; color: string; telegramPhotoUrl: string | null };
};

export function ManagerTodayBrigades({
  zoneName,
  startTime,
  endTime,
  shifts,
  weekdayLabel,
  dateLabel
}: {
  zoneName: string;
  startTime: string;
  endTime: string;
  shifts: ManagerTodayShift[];
  weekdayLabel: string;
  dateLabel: string;
}) {
  const hasStaff = shifts.length > 0;

  return (
    <div className="space-y-3 animate-in">
      <div className="sticky top-0 z-10 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur-md [-webkit-backdrop-filter:blur(10px)] sm:p-3.5">
        <h2 className="text-sm font-bold uppercase tracking-display">Смены на сегодня</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          <span className="font-medium text-foreground/90">{weekdayLabel}</span>
          <span className="text-muted"> · </span>
          <span>{dateLabel}</span>
        </p>
        <p className="mt-1 font-mono text-xs text-muted">
          {zoneName} · {startTime}–{endTime}
        </p>
      </div>

      <section className="card overflow-hidden border-border/90 shadow-none">
        <div className="px-3 py-3 sm:px-4 sm:py-3.5">
          {hasStaff ? (
            <ul className="flex flex-wrap gap-2">
              {shifts.map((s) => (
                <li
                  key={s.id}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.06] px-2.5 py-1.5 pr-3"
                >
                  <UserAvatar
                    name={s.user.name}
                    photoUrl={s.user.telegramPhotoUrl}
                    color={s.user.color}
                    size="sm"
                  />
                  <span className="truncate text-xs font-semibold text-foreground/95">{s.user.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div
              className={cn(
                "flex min-h-[2.75rem] items-center justify-center rounded-xl border border-dashed px-3 py-2.5",
                "border-highlight/35 bg-highlight/[0.06] text-center"
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-display text-highlight/95">
                Нет сотрудников на смене
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
