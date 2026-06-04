"use client";

import { useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_zone_id: "Некорректная точка.",
  zone_not_found: "Точка не найдена.",
  token_unavailable: "Не настроена база на сервере. Запустите ./deploy.sh (миграции).",
  database_unavailable: "База данных недоступна.",
  Unauthorized: "Нужна авторизация. Перезайдите в приложение.",
  Forbidden: "Нет прав администратора.",
  "Profile incomplete": "Завершите профиль в разделе «Кабинет»."
};

export function AdminQrDownloadButton({
  zoneId,
  zoneName,
  label = "Скачать QR-код"
}: {
  zoneId: string;
  zoneName: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const loadQr = async () => {
    setLoading(true);
    setError("");
    setImageUrl(null);

    try {
      const res = await fetch(`/api/admin/workplace-qr?zoneId=${encodeURIComponent(zoneId)}`, {
        credentials: "include"
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        zoneName?: string;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.url) {
        const key = data.error ?? (res.status === 401 ? "Unauthorized" : res.status === 403 ? "Forbidden" : "");
        throw new Error(
          ERROR_MESSAGES[key] ??
            "Не удалось получить ссылку для QR. Обновите страницу или обратитесь к администратору."
        );
      }

      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(data.url, {
        margin: 2,
        width: 512,
        errorCorrectionLevel: "M"
      });

      setImageUrl(dataUrl);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки QR");
    } finally {
      setLoading(false);
    }
  };

  const fileName = `qr-${zoneName.replace(/[^\w\u0400-\u04FF-]+/g, "-") || "shop"}.png`;

  return (
    <>
      <button
        type="button"
        className="btn-secondary inline-flex min-h-[44px] items-center justify-center touch-manipulation"
        disabled={loading}
        onClick={() => void loadQr()}
      >
        {loading ? "Генерируем…" : label}
      </button>
      {error ? <p className="mt-2 text-sm font-medium text-foreground/85">{error}</p> : null}

      {open && imageUrl ? (
        <div
          className="fixed inset-0 z-[240] flex items-end justify-center bg-background/85 p-4 backdrop-blur-[2px] sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-background p-4 shadow-lg"
            role="dialog"
            aria-modal
            aria-label={`QR-код: ${zoneName}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-sm font-semibold">{zoneName}</p>
              <p className="mt-1 text-xs text-muted">QR для отметки прихода на точке</p>
            </div>
            <img
              src={imageUrl}
              alt={`QR ${zoneName}`}
              className="mx-auto w-full max-w-[280px] rounded-lg border border-border bg-white p-2"
            />
            <p className="text-center text-xs text-muted">
              На телефоне: нажмите и удерживайте изображение → «Сохранить в Фото». На компьютере — кнопка ниже.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary w-full" onClick={() => setOpen(false)}>
                Закрыть
              </button>
              <a
                href={imageUrl}
                download={fileName}
                className="btn-primary inline-flex w-full items-center justify-center"
              >
                Скачать PNG
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
