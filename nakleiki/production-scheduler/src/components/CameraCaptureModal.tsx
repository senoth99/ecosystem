"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onCapture: (file: File) => void;
};

export function CameraCaptureModal({ open, title, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      setError(null);
      setStarting(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Камера недоступна в этом браузере.");
      return;
    }

    let cancelled = false;
    setStarting(true);
    setError(null);

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        if (!cancelled) setStarting(false);
      } catch (e) {
        if (!cancelled) {
          setStarting(false);
          const msg =
            e instanceof DOMException && e.name === "NotAllowedError"
              ? "Разрешите доступ к камере в настройках браузера."
              : "Не удалось включить камеру.";
          setError(msg);
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, stopStream]);

  const handleClose = () => {
    stopStream();
    onClose();
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setError("Камера ещё не готова. Подождите секунду.");
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setError("Не удалось получить кадр с камеры.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Не удалось обработать фото.");
      return;
    }

    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Не удалось сохранить фото.");
          return;
        }
        stopStream();
        onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
        onClose();
      },
      "image/jpeg",
      0.9
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[190] flex flex-col bg-black">
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/80 px-4 py-3">
          <p className="text-sm font-semibold uppercase tracking-display">{title ?? "Камера"}</p>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
            aria-label="Закрыть"
            onClick={handleClose}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 h-full w-full object-cover"
          />
          {starting ? (
            <p className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-muted">
              Включаем камеру…
            </p>
          ) : null}
          {error ? (
            <div className="absolute inset-x-4 bottom-24 rounded-lg border border-border bg-card/90 px-3 py-2 text-center text-sm text-foreground/90">
              {error}
            </div>
          ) : null}
        </div>

        <div className="relative z-10 flex shrink-0 gap-2 border-t border-border/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" className="btn-secondary flex-1" onClick={handleClose}>
            Отмена
          </button>
          <button type="button" className="btn-primary flex-1" onClick={capture} disabled={starting || Boolean(error)}>
            Сделать фото
          </button>
        </div>
      </div>
    </div>
  );
}
