"use client";

import { useEffect, useMemo, useState } from "react";
import { CameraCaptureModal } from "@/components/CameraCaptureModal";
import { StickerApplyClient } from "@/components/stickers/StickerApplyClient";
import { compressImageFile } from "@/lib/clientImageCompress";
import { formatDateRu, safeParseISO, startOfAppDay } from "@/lib/utils";
import { StickerDailyPhotoKind, type StickerDailyPhotoKind as StickerDailyPhotoKindValue } from "@/lib/stickerPhotoKinds";

type PhotoRow = { id: string; kind: string; path: string | null };
type DailyReport = {
  id: string;
  reportDate: string;
  status: string;
  moderatorComment: string;
  photos: PhotoRow[];
};
type Stats = {
  requiredDays: number;
  missLimit: number;
  approvedCount: number;
  daysSinceStart: number;
  missesUsed: number;
  missesLeft: number;
  eligibleForReward: boolean;
};
type Application = {
  id: string;
  status: string;
  plateNumber: string;
  approvedAt: string | null;
  dailyReports: DailyReport[];
};

const PHOTO_ORDER: { kind: StickerDailyPhotoKindValue; title: string }[] = [
  { kind: StickerDailyPhotoKind.MAIN, title: "Фото наклейки" },
  { kind: StickerDailyPhotoKind.CONTEXT, title: "Общий вид" }
];

function toPhotoMap(report: DailyReport | null): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const p of report?.photos ?? []) {
    if (p.kind) map[p.kind] = p.path;
  }
  return map;
}

export function StickerDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<Application | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);
  const [photoByKind, setPhotoByKind] = useState<Record<string, string | null>>({});
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);
  const [captureKind, setCaptureKind] = useState<StickerDailyPhotoKindValue | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approvedCount = useMemo(() => stats?.approvedCount ?? 0, [stats]);
  const isApproved = app?.status === "APPROVED";

  const loadDaily = async () => {
    const res = await fetch("/api/stickers/daily", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { application: Application | null; stats: Stats | null };
    if (!res.ok) throw new Error("Не удалось загрузить дневные отчёты");
    setApp(data.application);
    setStats(data.stats ?? null);

    const application = data.application;
    if (!application) {
      setTodayReport(null);
      setPhotoByKind({});
      return;
    }
    const today = startOfAppDay(new Date()).getTime();
    const existing =
      (application.dailyReports ?? []).find((r) => startOfAppDay(new Date(r.reportDate)).getTime() === today) ?? null;
    setTodayReport(existing);
    setPhotoByKind(toPhotoMap(existing));
  };

  const refresh = async () => {
    setError(null);
    setLoading(true);
    try {
      await loadDaily();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createToday = async (): Promise<string | null> => {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/stickers/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({})
      });
      const data = (await res.json().catch(() => ({}))) as { report?: DailyReport; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Не удалось создать отчёт");
      const report = data.report ?? null;
      setTodayReport(report);
      setPhotoByKind(toPhotoMap(report));
      await refresh();
      return report?.id ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
      return null;
    } finally {
      setCreating(false);
    }
  };

  const uploadPhoto = async (kind: StickerDailyPhotoKindValue, file: File) => {
    let reportId = todayReport?.id ?? null;
    if (!reportId) {
      reportId = await createToday();
    }
    if (!reportId) {
      setError("Не удалось создать дневной отчёт. Попробуйте ещё раз.");
      return;
    }

    setError(null);
    setUploadingKind(kind);
    try {
      const blob = await compressImageFile(file, 1400, 0.82);
      const fd = new FormData();
      fd.append("reportId", reportId);
      fd.append("kind", kind);
      fd.append("file", new File([blob], `${kind}.jpg`, { type: "image/jpeg" }));

      const res = await fetch("/api/stickers/daily/photo", { method: "POST", body: fd, credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить фото");
      const path = data.path ?? null;
      setPhotoByKind((prev) => ({ ...prev, [kind]: path ? `${path}&t=${Date.now()}` : null }));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploadingKind(null);
    }
  };

  const todayDate = startOfAppDay(new Date());

  return (
    <div className="space-y-4">
      <h1 className="ui-page-title">Наклейка</h1>

      <StickerApplyClient />

      {isApproved ? (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-bold uppercase tracking-display">Ежедневные фото</h2>
              <p className="text-xs text-muted">
                Прогресс: {approvedCount}/{stats?.requiredDays ?? 30}
                {stats ? ` • пропуски ${stats.missesUsed}/${stats.missLimit}` : ""}
              </p>
            </div>
            {stats?.eligibleForReward ? (
              <a href="/stickers/reward" className="btn-primary inline-flex items-center justify-center">
                Шмотка
              </a>
            ) : null}
          </div>

          <p className="text-sm text-muted">
            Сегодня: <span className="text-foreground/90">{formatDateRu(todayDate, "dd.MM.yyyy")}</span>
          </p>

          {!todayReport ? (
            <button className="btn-secondary w-full" disabled={creating} onClick={() => void createToday()}>
              {creating ? "Создаём..." : "Создать отчёт за сегодня"}
            </button>
          ) : (
            <p className="text-xs text-muted">
              Статус отчёта:{" "}
              <span className="text-foreground/90">
                {todayReport.status === "PENDING_REVIEW"
                  ? "на модерации"
                  : todayReport.status === "APPROVED"
                    ? "одобрено"
                    : "отклонено"}
              </span>
            </p>
          )}

          {todayReport?.status === "REJECTED" && todayReport.moderatorComment ? (
            <div className="rounded-lg border border-border/70 bg-card/40 px-3 py-2.5 text-sm">
              <p className="ui-section-kicker-strong">Комментарий модератора</p>
              <p className="mt-1 text-foreground/90">{todayReport.moderatorComment}</p>
            </div>
          ) : null}

          {todayReport ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {PHOTO_ORDER.map(({ kind, title }) => {
                const src = photoByKind[kind] ?? null;
                const busy = uploadingKind === kind;
                return (
                  <div key={kind} className="space-y-2 rounded-lg border border-border/70 bg-card/40 p-3">
                    <p className="ui-section-kicker-strong">{title}</p>
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-border/70 bg-black/30">
                      {src ? <img src={src} alt={title} className="h-full w-full object-cover" /> : null}
                    </div>
                    <button
                      type="button"
                      className="btn-subtle w-full"
                      disabled={busy}
                      onClick={() => setCaptureKind(kind)}
                    >
                      {busy ? "Загружаем..." : src ? "Переснять (камера)" : "Снять (камера)"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {loading ? <p className="text-center text-xs text-muted">Загрузка…</p> : null}
      {error ? <p className="text-center text-sm font-medium text-foreground/85">{error}</p> : null}

      <CameraCaptureModal
        open={captureKind !== null}
        title={PHOTO_ORDER.find((p) => p.kind === captureKind)?.title ?? "Фото"}
        onClose={() => setCaptureKind(null)}
        onCapture={(file) => {
          const kind = captureKind;
          if (!kind) return;
          setCaptureKind(null);
          void uploadPhoto(kind, file);
        }}
      />

      {isApproved && app?.dailyReports?.length ? (
        <section className="card space-y-2">
          <h2 className="text-base font-bold uppercase tracking-display">История</h2>
          <div className="space-y-2">
            {app.dailyReports.slice(0, 14).map((r) => (
              <div key={r.id} className="rounded-lg border border-border/70 bg-card/40 px-3 py-2">
                <p className="text-sm font-semibold">
                  {formatDateRu(safeParseISO(r.reportDate), "dd.MM.yyyy")} •{" "}
                  {r.status === "PENDING_REVIEW" ? "на модерации" : r.status === "APPROVED" ? "одобрено" : "отклонено"}
                </p>
                {r.moderatorComment && r.status === "REJECTED" ? (
                  <p className="mt-1 text-xs text-muted">{r.moderatorComment}</p>
                ) : null}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted">Показаны последние 14 записей.</p>
        </section>
      ) : null}
    </div>
  );
}

