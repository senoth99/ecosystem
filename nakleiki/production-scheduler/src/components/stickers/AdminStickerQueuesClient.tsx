"use client";

import { useMemo, useState, useTransition } from "react";
import { formatDateRu, safeParseISO } from "@/lib/utils";

type UserMini = {
  id: string;
  name: string;
  telegramUsername: string | null;
  telegramPhotoUrl: string | null;
};

type ApplicationRow = {
  id: string;
  userId: string;
  fullName: string;
  plateNumber: string;
  status: string;
  createdAt: string;
  photos: { id: string; kind: string; path: string | null }[];
  user: UserMini;
};

type DailyRow = {
  id: string;
  applicationId: string;
  userId: string;
  reportDate: string;
  status: string;
  createdAt: string;
  photos: { id: string; kind: string; path: string | null }[];
  application: { id: string; plateNumber: string; status: string };
  user: UserMini;
};

export function AdminStickerQueuesClient({
  initial
}: {
  initial: { applications: ApplicationRow[]; dailyReports: DailyRow[] };
}) {
  const [apps, setApps] = useState<ApplicationRow[]>(initial.applications ?? []);
  const [daily, setDaily] = useState<DailyRow[]>(initial.dailyReports ?? []);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [commentById, setCommentById] = useState<Record<string, string>>({});

  const appsCount = apps.length;
  const dailyCount = daily.length;

  const defaultComment = useMemo(
    () => "Спасибо! Модерация выполнена. Если нужно — перезагрузите фото и отправьте снова.",
    []
  );

  const decideApplication = (id: string, decision: "APPROVE" | "REJECT") => {
    start(async () => {
      setError(null);
      const comment = (commentById[id] ?? "").trim() || defaultComment;
      try {
        const res = await fetch("/api/admin/stickers/applications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id, decision, comment })
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить решение");
        setApps((prev) => prev.filter((a) => a.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  };

  const decideDaily = (id: string, decision: "APPROVE" | "REJECT") => {
    start(async () => {
      setError(null);
      const comment = (commentById[id] ?? "").trim() || defaultComment;
      try {
        const res = await fetch("/api/admin/stickers/daily", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id, decision, comment })
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить решение");
        setDaily((prev) => prev.filter((r) => r.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Наклейки — модерация</h1>
          <p className="text-sm text-muted">
            Очереди: заявок {appsCount}, дневных отчётов {dailyCount}.
          </p>
        </div>
        {pending ? <p className="text-xs text-muted">Сохраняем…</p> : null}
      </div>

      {error ? <p className="text-center text-sm font-medium text-foreground/85">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="ui-page-title">Заявки</h2>
        {apps.length === 0 ? (
          <div className="card text-sm text-muted">Пусто.</div>
        ) : (
          <div className="space-y-3">
            {apps.map((a) => {
              const tg = a.user.telegramUsername ? `@${a.user.telegramUsername}` : "—";
              return (
                <div key={a.id} className="card space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {a.fullName} • {a.plateNumber}
                      </p>
                      <p className="text-xs text-muted">
                        {a.user.name} • {tg} • {formatDateRu(safeParseISO(a.createdAt), "dd.MM.yy HH:mm")}
                      </p>
                    </div>
                    {a.user.telegramPhotoUrl ? (
                      <img
                        src={a.user.telegramPhotoUrl}
                        alt="avatar"
                        className="h-10 w-10 rounded-full border border-border object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {a.photos.map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-md border border-border/70 bg-black/20">
                        {p.path ? <img src={`${p.path}&t=${Date.now()}`} alt={p.kind} className="h-40 w-full object-cover" /> : null}
                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-display text-muted">{p.kind}</p>
                      </div>
                    ))}
                  </div>

                  <textarea
                    value={commentById[a.id] ?? ""}
                    onChange={(e) => setCommentById((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    placeholder="Комментарий (обязателен, если пусто — подставим дефолт)"
                    className="min-h-[72px] w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[14px]"
                  />

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button className="btn-secondary" disabled={pending} onClick={() => decideApplication(a.id, "REJECT")}>
                      Отклонить
                    </button>
                    <button className="btn-primary" disabled={pending} onClick={() => decideApplication(a.id, "APPROVE")}>
                      Одобрить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="ui-page-title">Дневные отчёты</h2>
        {daily.length === 0 ? (
          <div className="card text-sm text-muted">Пусто.</div>
        ) : (
          <div className="space-y-3">
            {daily.map((r) => {
              const tg = r.user.telegramUsername ? `@${r.user.telegramUsername}` : "—";
              return (
                <div key={r.id} className="card space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {r.application.plateNumber} • {formatDateRu(safeParseISO(r.reportDate), "dd.MM.yyyy")}
                      </p>
                      <p className="text-xs text-muted">
                        {r.user.name} • {tg} • {formatDateRu(safeParseISO(r.createdAt), "dd.MM.yy HH:mm")}
                      </p>
                    </div>
                    {r.user.telegramPhotoUrl ? (
                      <img
                        src={r.user.telegramPhotoUrl}
                        alt="avatar"
                        className="h-10 w-10 rounded-full border border-border object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {r.photos.map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-md border border-border/70 bg-black/20">
                        {p.path ? <img src={`${p.path}&t=${Date.now()}`} alt={p.kind} className="h-40 w-full object-cover" /> : null}
                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-display text-muted">{p.kind}</p>
                      </div>
                    ))}
                  </div>

                  <textarea
                    value={commentById[r.id] ?? ""}
                    onChange={(e) => setCommentById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Комментарий (обязателен, если пусто — подставим дефолт)"
                    className="min-h-[72px] w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[14px]"
                  />

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button className="btn-secondary" disabled={pending} onClick={() => decideDaily(r.id, "REJECT")}>
                      Отклонить
                    </button>
                    <button className="btn-primary" disabled={pending} onClick={() => decideDaily(r.id, "APPROVE")}>
                      Одобрить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

