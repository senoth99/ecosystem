"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMyShiftReport } from "@/app/actions";

export function ReportTextEditor({
  reportId,
  initialText,
  canEdit,
  label = "Текст отчёта"
}: {
  reportId: string;
  initialText: string;
  canEdit: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!canEdit) {
    return (
      <div className="rounded-lg border border-border/70 bg-card/40 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-display text-muted">{label}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {initialText.trim() ? initialText : "—"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-card/40 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-display text-muted">{label}</p>
      {editing ? (
        <>
          <textarea
            className="min-h-32 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-1 focus-visible:ring-foreground/35"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            disabled={pending}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() => {
                setError("");
                if (text.trim().length < 5) {
                  setError("Напишите чуть подробнее — минимум 5 символов.");
                  return;
                }
                start(async () => {
                  try {
                    await updateMyShiftReport({ reportId, text });
                    setEditing(false);
                    router.refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Не удалось обновить отчёт.");
                  }
                });
              }}
            >
              {pending ? "Сохраняем…" : "Сохранить"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() => {
                setText(initialText);
                setEditing(false);
                setError("");
              }}
            >
              Отмена
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{initialText}</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setText(initialText);
              setEditing(true);
              setError("");
            }}
          >
            Редактировать отчёт
          </button>
        </>
      )}
      {error ? <p className="text-sm font-medium text-foreground/85">{error}</p> : null}
    </div>
  );
}
