"use client";

import { useEffect, useMemo, useState } from "react";
import { CameraCaptureModal } from "@/components/CameraCaptureModal";
import { compressImageFile } from "@/lib/clientImageCompress";
import { formatDateRu, startOfAppDay } from "@/lib/utils";
import { StickerDailyPhotoKind, type StickerDailyPhotoKind as StickerDailyPhotoKindValue } from "@/lib/stickerPhotoKinds";

type PhotoRow = { id: string; kind: string; path: string | null };
type DailyReport = {
  id: string;
  reportDate: string;
  status: string;
  moderatorComment: string;
  photos: PhotoRow[];
};
type Application = {
  id: string;
  status: string;
  approvedAt: string | null;
  dailyReports: DailyReport[];
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

type ApiGet = { application: Application | null; stats: Stats | null };

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

export function StickerDailyClient() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [app, setApp] = useState<Application | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);
  const [photoByKind, setPhotoByKind] = useState<Record<string, string | null>>({});
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);
  const [captureKind, setCaptureKind] = useState<StickerDailyPhotoKindValue | null>(null);

  const approvedCount = useMemo(() => stats?.approvedCount ?? (app?.dailyReports ?? []).filter((r) => r.status === "APPROVED").length, [app, stats]);

  const canUpload = useMemo(() => {
    if (!todayReport) return false;
    return todayReport.status !== "APPROVED";
  }, [todayReport]);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/stickers/daily", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as ApiGet;
      if (!res.ok) throw new Error("Не удалось загрузить дневные отчёты");
      const application = data.application;
      setApp(application);
      setStats(data.stats ?? null);
      if (!application) {
        setTodayReport(null);
        setPhotoByKind({});
        return;
      }

      const today = startOfAppDay(new Date()).getTime();
      const existing = (application.dailyReports ?? []).find((r) => startOfAppDay(new Date(r.reportDate)).getTime() === today) ?? null;
      setTodayReport(existing);
      setPhotoByKind(toPhotoMap(existing));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createToday = async (): Promise<string | null> => {
    setError("");
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
      await load();
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

    setError("");
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
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploadingKind(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="card skeleton h-20" />
        <div className="card skeleton h-52" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="space-y-4">
        <h1 className="ui-page-title">Ежедневные фото</h1>
        <div className="card text-sm text-muted">Сначала подайте заявку и загрузите фото машины.</div>
        <a href="/stickers/apply" className="btn-primary inline-flex items-center justify-center">
          Перейти к заявке
        </a>
      </div>
    );
  }

  const todayDate = startOfAppDay(new Date());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="ui-page-title">Ежедневные фото</h1>
        <span className="text-[10px] font-bold uppercase tracking-display text-muted">
          прогресс: {approvedCount}/{stats?.requiredDays ?? 30}
        </span>
      </div>

      <div className="card space-y-2">
        <p className="text-sm text-muted">
          Сегодня: <span className="text-foreground/90">{formatDateRu(todayDate, "dd.MM.yyyy")}</span>
        </p>
        {stats ? (
          <p className="text-xs text-muted">
            Пропуски: использовано {stats.missesUsed}/{stats.missLimit}, осталось {stats.missesLeft}.
          </p>
        ) : null}
        <p className="text-xs text-muted">
          {app.status === "APPROVED"
            ? "Заявка одобрена — этот день будет засчитан после проверки отчёта модератором."
            : "Заявка ещё не одобрена — фото можно отправлять, но дни начнут считаться после аппрува."}
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
      </div>

      {todayReport ? (
        <section className="card space-y-3">
          <h2 className="text-base font-bold uppercase tracking-display">Фото дня (2 шт)</h2>
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
                    disabled={!canUpload || busy}
                    onClick={() => setCaptureKind(kind)}
                  >
                    {busy ? "Загружаем..." : src ? "Переснять (камера)" : "Снять (камера)"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {stats?.eligibleForReward ? (
        <a href="/stickers/reward" className="btn-primary inline-flex items-center justify-center">
          Получить шмотку
        </a>
      ) : null}

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
    </div>
  );
}

