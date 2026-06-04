"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ClipboardCheck } from "lucide-react";
import { submitShiftReport } from "@/app/actions";
import { compressImageFile } from "@/lib/clientImageCompress";
import { REPORT_PHOTO_KINDS, type ReportPhotoKind } from "@/lib/reportPhotoKinds";
import { ReportPhotoUploadSection } from "@/components/ReportPhotoUploadSection";

const emptyPhotoPaths = (): Record<ReportPhotoKind, string> => ({
  inside: "",
  workplace: "",
  outside: "",
  electrical: "",
  closing_receipt: ""
});

const emptyPhotoPreviews = (): Record<ReportPhotoKind, string> => ({
  inside: "",
  workplace: "",
  outside: "",
  electrical: "",
  closing_receipt: ""
});

const emptyUploading = (): Record<ReportPhotoKind, boolean> => ({
  inside: false,
  workplace: false,
  outside: false,
  electrical: false,
  closing_receipt: false
});

function formatShiftReportSubmitError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Unknown argument") && msg.includes("status")) {
    return "На сервере не обновлены Prisma и база: выполните «npx prisma db push» и «npx prisma generate», затем перезапустите приложение.";
  }
  if (msg.startsWith("Invalid `prisma.") && msg.length > 200) {
    return "Не удалось сохранить отчёт (ошибка базы). Обновите приложение или обратитесь к администратору.";
  }
  return msg;
}

export function CompleteShiftReportDialog({
  shiftId,
  headline
}: {
  shiftId: string;
  headline: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [salesCard, setSalesCard] = useState("");
  const [salesCash, setSalesCash] = useState("");
  const [photoPaths, setPhotoPaths] = useState(emptyPhotoPaths);
  const [photoPreviews, setPhotoPreviews] = useState(emptyPhotoPreviews);
  const [photoUploading, setPhotoUploading] = useState(emptyUploading);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const revokePreviews = () => {
    for (const url of Object.values(photoPreviews)) {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    }
  };

  const resetPhotos = () => {
    revokePreviews();
    setPhotoPreviews(emptyPhotoPreviews());
    setPhotoPaths(emptyPhotoPaths());
    setPhotoUploading(emptyUploading());
  };

  const close = () => {
    setOpen(false);
    setError("");
    setText("");
    setSalesCard("");
    setSalesCash("");
    resetPhotos();
  };

  const allPhotosUploaded = REPORT_PHOTO_KINDS.every((k) => Boolean(photoPaths[k.id]));
  const anyPhotoUploading = REPORT_PHOTO_KINDS.some((k) => photoUploading[k.id]);

  const handlePhotoSelected = async (kind: ReportPhotoKind, file: File) => {
    setError("");
    setPhotoUploading((prev) => ({ ...prev, [kind]: true }));
    const prevPreview = photoPreviews[kind];
    if (prevPreview.startsWith("blob:")) URL.revokeObjectURL(prevPreview);
    try {
      const blob = await compressImageFile(file);
      const preview = URL.createObjectURL(blob);
      setPhotoPreviews((prev) => ({ ...prev, [kind]: preview }));
      const form = new FormData();
      form.append("shiftId", shiftId);
      form.append("kind", kind);
      form.append("file", new File([blob], `${kind}.jpg`, { type: "image/jpeg" }));
      const res = await fetch("/api/reports/workplace-photo", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!res.ok) {
        URL.revokeObjectURL(preview);
        setPhotoPreviews((prev) => ({ ...prev, [kind]: "" }));
        setPhotoPaths((prev) => ({ ...prev, [kind]: "" }));
        const errKey = body.error ?? "upload_failed";
        if (errKey === "file_too_large") {
          setError("Фото слишком большое (макс. 3 МБ).");
        } else if (errKey === "unauthorized") {
          setError("Нужна авторизация. Обновите страницу и войдите снова.");
        } else {
          setError("Не удалось загрузить фото. Попробуйте ещё раз.");
        }
        return;
      }
      if (!body.path) {
        URL.revokeObjectURL(preview);
        setPhotoPreviews((prev) => ({ ...prev, [kind]: "" }));
        setError("Не удалось загрузить фото.");
        return;
      }
      setPhotoPaths((prev) => ({ ...prev, [kind]: body.path! }));
    } catch (err) {
      setPhotoPreviews((prev) => ({ ...prev, [kind]: "" }));
      setPhotoPaths((prev) => ({ ...prev, [kind]: "" }));
      setError(err instanceof Error ? err.message : "Не удалось обработать фото.");
    } finally {
      setPhotoUploading((prev) => ({ ...prev, [kind]: false }));
    }
  };

  const overlay =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-background/80 p-4 backdrop-blur-[2px]"
            role="presentation"
            style={{ overscrollBehavior: "contain" }}
            onClick={() => !pending && close()}
          >
            <div
              className="max-h-[min(90dvh,640px)] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-background"
              role="dialog"
              aria-modal
              aria-labelledby="shift-report-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-border/80 px-4 py-4">
                <p id="shift-report-title" className="text-base font-medium tracking-tight">
                  Отчёт по смене
                </p>
                <p className="mt-1 text-sm text-muted">{headline}</p>
              </div>
              <form
                className="space-y-4 px-4 py-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setError("");
                  if (text.trim().length < 5) {
                    setError("Напишите чуть подробнее — минимум 5 символов.");
                    return;
                  }
                  const cardParsed = Number(salesCard.replace(",", "."));
                  const cashParsed = Number(salesCash.replace(",", "."));
                  if (
                    salesCard.trim() === "" ||
                    salesCash.trim() === "" ||
                    !Number.isFinite(cardParsed) ||
                    !Number.isFinite(cashParsed) ||
                    cardParsed < 0 ||
                    cashParsed < 0
                  ) {
                    setError("Укажите суммы по карте и наличными.");
                    return;
                  }
                  if (!allPhotosUploaded) {
                    setError("Добавьте все фото перед отправкой.");
                    return;
                  }
                  start(async () => {
                    try {
                      await submitShiftReport({
                        shiftId,
                        text,
                        salesAmountCardRub: cardParsed,
                        salesAmountCashRub: cashParsed,
                        photoInsidePath: photoPaths.inside,
                        workplacePhotoPath: photoPaths.workplace,
                        photoOutsidePath: photoPaths.outside,
                        photoElectricalPanelPath: photoPaths.electrical,
                        photoClosingReceiptPath: photoPaths.closing_receipt
                      });
                      setText("");
                      close();
                      router.refresh();
                    } catch (err) {
                      setError(formatShiftReportSubmitError(err));
                    }
                  });
                }}
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground" htmlFor={`shift-report-text-${shiftId}`}>
                    Что вы сделали за смену
                  </label>
                  <textarea
                    id={`shift-report-text-${shiftId}`}
                    className="min-h-32 w-full resize-y rounded-lg border-0 bg-transparent px-0 py-2.5 text-sm leading-relaxed outline-none ring-0 focus-visible:outline-none"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setError("");
                    }}
                    placeholder="Опишите выполненную работу"
                    disabled={pending}
                    autoFocus
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-foreground"
                      htmlFor={`shift-report-sales-card-${shiftId}`}
                    >
                      Продано на (карта)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`shift-report-sales-card-${shiftId}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-foreground/35"
                        value={salesCard}
                        onChange={(e) => {
                          setSalesCard(e.target.value);
                          setError("");
                        }}
                        placeholder="0"
                        disabled={pending}
                      />
                      <span className="shrink-0 text-sm font-medium text-muted">₽</span>
                    </div>
                  </div>
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-foreground"
                      htmlFor={`shift-report-sales-cash-${shiftId}`}
                    >
                      Продано на (наличка)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`shift-report-sales-cash-${shiftId}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-foreground/35"
                        value={salesCash}
                        onChange={(e) => {
                          setSalesCash(e.target.value);
                          setError("");
                        }}
                        placeholder="0"
                        disabled={pending}
                      />
                      <span className="shrink-0 text-sm font-medium text-muted">₽</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {REPORT_PHOTO_KINDS.map((slot) => (
                    <ReportPhotoUploadSection
                      key={slot.id}
                      label={slot.label}
                      kind={slot.id}
                      shiftId={shiftId}
                      previewUrl={photoPreviews[slot.id]}
                      uploaded={Boolean(photoPaths[slot.id])}
                      uploading={photoUploading[slot.id]}
                      disabled={pending}
                      onPhotoSelected={handlePhotoSelected}
                    />
                  ))}
                </div>

                {error ? <p className="text-sm font-medium text-foreground/85">{error}</p> : null}

                <div className="grid w-full grid-cols-2 gap-3 pt-1 [grid-template-columns:repeat(2,minmax(0,1fr))]">
                  <button type="button" className="btn-secondary w-full" disabled={pending || anyPhotoUploading} onClick={close}>
                    Отменить
                  </button>
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={pending || anyPhotoUploading || !allPhotosUploaded}
                  >
                    {pending ? "Отправляем…" : "Завершить"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        className="absolute bottom-3 right-3 z-10 flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-foreground/[0.06]"
        aria-label="Отметить смену выполненной"
        onClick={() => setOpen(true)}
      >
        <ClipboardCheck size={18} className="shrink-0" aria-hidden />
      </button>

      {overlay}
    </>
  );
}
