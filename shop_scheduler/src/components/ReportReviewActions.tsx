"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptShiftReportWithAccrual } from "@/app/actions";
import { ShiftReportStatus } from "@/lib/enums";
import {
  SHIFT_APPEARANCE_RUB,
  SHIFT_KPI_THRESHOLD_RUB,
  calculateShiftReportAccrualRub,
  kpiRateForSalesRub
} from "@/lib/shiftReportAccrual";
import { formatMoneyRu } from "@/lib/utils";

export type ReportReviewActionsProps = {
  reportId: string;
  status: string;
  salesAmountCents: number | null;
  accrualAmountCents: number | null;
  accrualAppearanceCents: number | null;
  accrualWorkCents: number | null;
  acceptedByName: string | null;
  isAdmin: boolean;
};

function AccrualPreview({
  appearanceRub,
  kpiRub,
  totalRub,
  kpiRatePercent,
  salesTotalRub
}: {
  appearanceRub: number;
  kpiRub: number;
  totalRub: number;
  kpiRatePercent: number;
  salesTotalRub: number;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card/50 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Начисление</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">За выход</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{formatMoneyRu(appearanceRub)}</p>
          <p className="mt-0.5 text-[10px] text-muted">Фикс {formatMoneyRu(SHIFT_APPEARANCE_RUB)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">KPI</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{formatMoneyRu(kpiRub)}</p>
          <p className="mt-0.5 text-[10px] text-muted">
            {kpiRatePercent}% от {formatMoneyRu(salesTotalRub)}
            {salesTotalRub > SHIFT_KPI_THRESHOLD_RUB ? " (>100k)" : ""}
          </p>
        </div>
      </div>
      <div className="border-t border-border/70 pt-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Итого</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{formatMoneyRu(totalRub)}</p>
      </div>
    </div>
  );
}

export function ReportReviewActions({
  reportId,
  status,
  salesAmountCents,
  accrualAmountCents,
  accrualAppearanceCents,
  accrualWorkCents,
  acceptedByName,
  isAdmin
}: ReportReviewActionsProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const preview = useMemo(() => {
    if (salesAmountCents == null) return null;
    return calculateShiftReportAccrualRub(salesAmountCents / 100);
  }, [salesAmountCents]);

  if (!isAdmin) return null;

  const hasStoredBreakdown =
    accrualAmountCents != null && accrualAppearanceCents != null && accrualWorkCents != null;

  if (status === ShiftReportStatus.ACCEPTED) {
    const salesRub = (salesAmountCents ?? 0) / 100;
    const kpiRatePercent = Math.round(kpiRateForSalesRub(salesRub) * 100);

    return (
      <div className="card space-y-2 border-accent/40 bg-accent/12">
        <p className="text-xs font-bold uppercase tracking-display text-foreground">Отчёт принят</p>
        {accrualAmountCents != null ? (
          hasStoredBreakdown ? (
            <AccrualPreview
              appearanceRub={accrualAppearanceCents / 100}
              kpiRub={accrualWorkCents / 100}
              totalRub={accrualAmountCents / 100}
              kpiRatePercent={kpiRatePercent}
              salesTotalRub={salesRub}
            />
          ) : (
            <p className="text-sm text-muted">
              Начислено за смену:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoneyRu(accrualAmountCents / 100)}
              </span>
            </p>
          )
        ) : (
          <p className="text-xs text-muted">Начисление за этот отчёт не зафиксировано в системе.</p>
        )}
        {acceptedByName ? <p className="text-xs text-muted">Проверил: {acceptedByName}</p> : null}
      </div>
    );
  }

  if (status !== ShiftReportStatus.PENDING_REVIEW) return null;

  return (
    <div className="card space-y-4 border-highlight/35 bg-highlight/[0.06]">
      <p className="text-xs font-bold uppercase tracking-display text-foreground">Начисление за смену</p>

      {preview ? (
        <AccrualPreview
          appearanceRub={preview.appearanceRub}
          kpiRub={preview.kpiRub}
          totalRub={preview.totalRub}
          kpiRatePercent={preview.kpiRatePercent}
          salesTotalRub={preview.salesTotalRub}
        />
      ) : (
        <p className="text-sm text-muted">В отчёте нет суммы продаж — KPI посчитать нельзя.</p>
      )}

      <p className="text-xs text-muted">
        За выход — {formatMoneyRu(SHIFT_APPEARANCE_RUB)}. KPI — 10% от выручки до {formatMoneyRu(SHIFT_KPI_THRESHOLD_RUB)}{" "}
        включительно, 15% если больше.
      </p>

      <button
        type="button"
        className="btn-primary w-full"
        disabled={pending || !preview}
        onClick={() => {
          setError("");
          start(async () => {
            try {
              await acceptShiftReportWithAccrual({ reportId });
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Ошибка");
            }
          });
        }}
      >
        {pending ? "Сохраняем…" : "Начислить и принять"}
      </button>

      {error ? <p className="text-sm font-medium text-foreground/85">{error}</p> : null}
    </div>
  );
}
