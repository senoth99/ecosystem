/** Фикс за выход на смену (руб). */
export const SHIFT_APPEARANCE_RUB = 1500;

/** Порог выручки за смену: до включительно — 10%, выше — 15%. */
export const SHIFT_KPI_THRESHOLD_RUB = 100_000;

export const SHIFT_KPI_RATE_LOW = 0.1;
export const SHIFT_KPI_RATE_HIGH = 0.15;

export type ShiftReportAccrualBreakdown = {
  appearanceRub: number;
  kpiRub: number;
  totalRub: number;
  kpiRatePercent: number;
  salesTotalRub: number;
};

export function kpiRateForSalesRub(salesTotalRub: number): number {
  return salesTotalRub > SHIFT_KPI_THRESHOLD_RUB ? SHIFT_KPI_RATE_HIGH : SHIFT_KPI_RATE_LOW;
}

export function calculateShiftReportAccrualRub(salesTotalRub: number): ShiftReportAccrualBreakdown {
  const safeSales = Math.max(0, salesTotalRub);
  const rate = kpiRateForSalesRub(safeSales);
  const appearanceRub = SHIFT_APPEARANCE_RUB;
  const kpiRub = Math.round(safeSales * rate * 100) / 100;
  return {
    appearanceRub,
    kpiRub,
    totalRub: appearanceRub + kpiRub,
    kpiRatePercent: Math.round(rate * 100),
    salesTotalRub: safeSales
  };
}

export function calculateShiftReportAccrualCents(salesAmountCents: number) {
  const breakdown = calculateShiftReportAccrualRub(salesAmountCents / 100);
  return {
    appearanceCents: Math.round(breakdown.appearanceRub * 100),
    workCents: Math.round(breakdown.kpiRub * 100),
    totalCents: Math.round(breakdown.totalRub * 100),
    breakdown
  };
}

export function formatKpiRateLabel(salesTotalRub: number): string {
  const pct = Math.round(kpiRateForSalesRub(Math.max(0, salesTotalRub)) * 100);
  return `${pct}%`;
}
