"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CameraCaptureModal } from "@/components/CameraCaptureModal";
import { compressImageFile } from "@/lib/clientImageCompress";
import { applicationStatusLabel } from "@/lib/stickerApplicationStatus";
import {
  StickerApplicationPhotoKind,
  type StickerApplicationPhotoKind as StickerApplicationPhotoKindValue
} from "@/lib/stickerPhotoKinds";

type StickerApplication = {
  id: string;
  fullName: string;
  plateNumber: string;
  status: string;
  moderatorComment: string;
  photos: { id: string; kind: string; path: string | null }[];
};

type ApiGet = { application: StickerApplication | null };

const PHOTO_ORDER: { kind: StickerApplicationPhotoKindValue; title: string }[] = [
  { kind: StickerApplicationPhotoKind.FRONT, title: "Перед" },
  { kind: StickerApplicationPhotoKind.BACK, title: "Зад" },
  { kind: StickerApplicationPhotoKind.LEFT, title: "Левый бок" },
  { kind: StickerApplicationPhotoKind.RIGHT, title: "Правый бок" }
];

function normalizePlateInput(raw: string) {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 32);
}

export function StickerApplyClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [moderatorComment, setModeratorComment] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [photoByKind, setPhotoByKind] = useState<Record<string, string | null>>({});
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);
  const [captureKind, setCaptureKind] = useState<StickerApplicationPhotoKindValue | null>(null);
  const captureKindRef = useRef<StickerApplicationPhotoKindValue | null>(null);

  const canEdit = useMemo(() => status !== "APPROVED", [status]);
  const fieldsValid = useMemo(() => fullName.trim().length >= 2 && plateNumber.trim().length >= 3, [fullName, plateNumber]);
  const allPhotosReady = useMemo(
    () => PHOTO_ORDER.every(({ kind }) => Boolean(photoByKind[kind])),
    [photoByKind]
  );
  const statusLabel = useMemo(() => (status ? applicationStatusLabel(status) : null), [status]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/stickers/application", { credentials: "include" });
        const data = (await res.json()) as ApiGet;
        if (!res.ok) throw new Error("Не удалось загрузить заявку");
        if (cancelled) return;

        const app = data.application;
        if (app) {
          setApplicationId(app.id);
          setStatus(app.status);
          setModeratorComment(app.moderatorComment ?? "");
          setFullName(app.fullName ?? "");
          setPlateNumber(app.plateNumber ?? "");
          const map: Record<string, string | null> = {};
          for (const p of app.photos ?? []) {
            if (p.kind) map[p.kind] = p.path;
          }
          setPhotoByKind(map);
        } else {
          setApplicationId(null);
          setStatus(null);
          setModeratorComment("");
          setPhotoByKind({});
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveApplication = async (opts?: { submit?: boolean }): Promise<string | null> => {
    setSaving(true);
    try {
      const res = await fetch("/api/stickers/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: fullName.trim(),
          plateNumber: normalizePlateInput(plateNumber),
          submit: opts?.submit === true
        })
      });
      const data = (await res.json().catch(() => ({}))) as { application?: StickerApplication; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить заявку");
      if (data.application) {
        setApplicationId(data.application.id);
        setStatus(data.application.status);
        setModeratorComment(data.application.moderatorComment ?? "");
        return data.application.id;
      }
      return null;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  };

  const submitApplication = async () => {
    if (!fieldsValid || !allPhotosReady) return;
    await saveApplication({ submit: true });
  };

  const uploadPhoto = async (kind: StickerApplicationPhotoKindValue, file: File) => {
    let currentId = applicationId;
    if (!currentId) {
      if (!fieldsValid) return;
      currentId = await saveApplication();
      if (!currentId) return;
    }

    setUploadingKind(kind);
    try {
      const blob = await compressImageFile(file, 1400, 0.82);
      const fd = new FormData();
      fd.append("applicationId", currentId);
      fd.append("kind", kind);
      fd.append("file", new File([blob], `${kind}.jpg`, { type: "image/jpeg" }));

      const res = await fetch("/api/stickers/application/photo", {
        method: "POST",
        body: fd,
        credentials: "include"
      });
      const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить фото");
      const path = data.path ?? null;
      setPhotoByKind((prev) => ({ ...prev, [kind]: path ? `${path}&t=${Date.now()}` : null }));
    } catch {
      /* ignore */
    } finally {
      setUploadingKind(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="card skeleton h-20" />
        <div className="card skeleton h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <h2 className="text-base font-bold uppercase tracking-display">Гайд по наклейке</h2>
        <ul className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Наклейка должна быть видна на ежедневных фото.</li>
          <li>Разрешённые материалы: винил/плёнка для авто, печать стойкая к погоде.</li>
          <li>Нельзя перекрывать номер/оптику/обзор. Наклейка должна быть аккуратно наклеена без складок.</li>
        </ul>
        <a className="link-tech text-sm" href="/api/stickers/template" target="_blank" rel="noreferrer">
          Скачать макет наклейки для печати (SVG)
        </a>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold uppercase tracking-display">Анкета</h2>
          {statusLabel ? (
            <span className="text-[10px] font-bold uppercase tracking-display text-muted">статус: {statusLabel}</span>
          ) : null}
        </div>

        {status === "REJECTED" && moderatorComment ? (
          <div className="rounded-lg border border-border/70 bg-card/40 px-3 py-2.5 text-sm">
            <p className="ui-section-kicker-strong">Комментарий модератора</p>
            <p className="mt-1 text-foreground/90">{moderatorComment}</p>
          </div>
        ) : null}

        <div className="grid gap-2">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="ФИО (как в паспорте)"
            disabled={!canEdit || saving}
            autoComplete="name"
          />
          <input
            value={plateNumber}
            onChange={(e) => setPlateNumber(normalizePlateInput(e.target.value))}
            placeholder="Номер авто (например: A123BC 77)"
            disabled={!canEdit || saving}
            inputMode="text"
            autoComplete="off"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {PHOTO_ORDER.map(({ kind, title }) => {
            const src = photoByKind[kind] ?? null;
            const busy = uploadingKind === kind;
            return (
              <div key={kind} className="space-y-2">
                <p className="ui-section-kicker-strong">{title}</p>
                <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-border/15 bg-black/30">
                  {src ? <img src={src} alt={title} className="h-full w-full object-cover" /> : null}
                </div>
                <button
                  type="button"
                  className="btn-subtle w-full"
                  disabled={!canEdit || busy || saving}
                  onClick={() => {
                    captureKindRef.current = kind;
                    setCaptureKind(kind);
                  }}
                >
                  {busy ? "Загружаем..." : src ? "Переснять (камера)" : "Снять (камера)"}
                </button>
              </div>
            );
          })}
        </div>

        <button
          className="btn-primary w-full"
          disabled={!canEdit || saving || !fieldsValid || !allPhotosReady}
          onClick={() => void submitApplication()}
        >
          {saving ? "Отправляем..." : "Отправить заявку"}
        </button>
      </section>

      <CameraCaptureModal
        open={captureKind !== null}
        title={PHOTO_ORDER.find((p) => p.kind === captureKind)?.title ?? "Фото"}
        onClose={() => {
          captureKindRef.current = null;
          setCaptureKind(null);
        }}
        onCapture={(file) => {
          const kind = captureKindRef.current ?? captureKind;
          captureKindRef.current = null;
          setCaptureKind(null);
          if (!kind) return;
          void uploadPhoto(kind, file);
        }}
      />
    </div>
  );
}
