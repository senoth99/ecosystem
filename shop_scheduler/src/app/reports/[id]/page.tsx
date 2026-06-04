import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { ReportTextEditor } from "@/components/ReportTextEditor";
import { ReportReviewActions } from "@/components/ReportReviewActions";
import { ReportStatusBadge } from "@/components/ReportStatusBadge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getReportById } from "@/app/actions";
import { catchDb } from "@/lib/dbBoundary";
import { getCurrentUser, requireAuthWithZone } from "@/lib/auth";
import { ShiftReportStatus } from "@/lib/enums";
import { formatDateRu, formatMoneyRu, isoFromWeekDay, weekDays } from "@/lib/utils";
import { getReportPhotoPathFromRecord, REPORT_PHOTO_KINDS } from "@/lib/reportPhotoKinds";
import { normalizeReportPhotoPath } from "@/lib/workplaceReportPhoto";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthWithZone();
  const { id } = await params;
  const reportResult = await catchDb(`reports/${id}`, () => getReportById(id));
  if (!reportResult.ok) return <ServiceUnavailable scope={`reports/${id}`} />;
  const report = reportResult.data;
  if (!report) notFound();

  try {
    const viewer = await getCurrentUser();
    const isAdmin = Boolean(viewer?.isManager) || viewer?.role === "ADMIN" || viewer?.role === "SUPER_ADMIN";

    const dayLabel = weekDays.find((w) => w.index === report.shift.dayOfWeek)?.name ?? "";
    const shiftDate = isoFromWeekDay(report.shift.weekStartDate, report.shift.dayOfWeek);
    const slot = `${report.shift.zone.name} · ${dayLabel}, ${formatDateRu(shiftDate)} · ${report.shift.startTime}–${report.shift.endTime}`;

    const showEmployeeAccrual =
      !isAdmin &&
      report.status === ShiftReportStatus.ACCEPTED &&
      report.accrualAmountCents != null;

    const reportPhotos = REPORT_PHOTO_KINDS.map((slot) => ({
      label: slot.label,
      src: normalizeReportPhotoPath(getReportPhotoPathFromRecord(report, slot.id), report.shiftId, slot.id)
    })).filter((p) => p.src);

    return (
      <div className="space-y-4">
        <Link href="/reports" className="link-tech inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Все отчеты
        </Link>

        <div className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-bold">Отчет по смене</h1>
              <p className="text-sm text-muted">{slot}</p>
              {isAdmin ? <p className="text-sm font-medium">{report.user.name}</p> : null}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
                <ReportStatusBadge status={report.status} />
                <p className="text-xs text-muted">
                  Отправлено {formatDateRu(report.createdAt, "dd.MM.yyyy HH:mm")}
                </p>
              </div>
            </div>
          </div>

          {!isAdmin && report.status === ShiftReportStatus.PENDING_REVIEW ? (
            <p className="rounded-sm border border-highlight/45 bg-highlight/12 px-3 py-2.5 text-sm leading-snug text-foreground/90">
              Отчёт на проверке. После проверки появится начисление и статус «Принят».
            </p>
          ) : null}

          {showEmployeeAccrual ? (
            <div className="rounded-lg border border-accent/45 bg-accent/15 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-display text-foreground">За смену начислено</p>
              {report.accrualAppearanceCents != null && report.accrualWorkCents != null ? (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">За выход</p>
                      <p className="mt-0.5 font-semibold tabular-nums">
                        {formatMoneyRu(report.accrualAppearanceCents / 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">KPI</p>
                      <p className="mt-0.5 font-semibold tabular-nums">
                        {formatMoneyRu(report.accrualWorkCents / 100)}
                      </p>
                    </div>
                  </div>
                  <p className="border-t border-accent/30 pt-2 text-sm text-muted">
                    Итого:{" "}
                    <span className="text-xl font-bold tabular-nums text-foreground">
                      {formatMoneyRu(report.accrualAmountCents! / 100)}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {formatMoneyRu(report.accrualAmountCents! / 100)}
                </p>
              )}
            </div>
          ) : null}

          {report.salesAmountCardCents != null || report.salesAmountCashCents != null ? (
            <div className="rounded-lg border border-border/70 bg-card/40 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-display text-muted">Продано на</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {report.salesAmountCardCents != null ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Карта</p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums">
                      {formatMoneyRu(report.salesAmountCardCents / 100)}
                    </p>
                  </div>
                ) : null}
                {report.salesAmountCashCents != null ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Наличка</p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums">
                      {formatMoneyRu(report.salesAmountCashCents / 100)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : report.salesAmountCents != null ? (
            <div className="rounded-lg border border-border/70 bg-card/40 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-display text-muted">Продано на</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{formatMoneyRu(report.salesAmountCents / 100)}</p>
            </div>
          ) : null}

          <ReportTextEditor
            reportId={report.id}
            initialText={report.text}
            canEdit={!isAdmin && report.status === ShiftReportStatus.PENDING_REVIEW}
            label="Что сделано за смену"
          />

          {reportPhotos.length > 0 ? (
            <div className="space-y-4">
              {reportPhotos.map((photo) => (
                <div key={photo.label} className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{photo.label}</p>
                  <img
                    src={photo.src!}
                    alt={photo.label}
                    className="max-h-80 w-full rounded-lg border border-border object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <ReportReviewActions
            reportId={report.id}
            status={report.status}
            salesAmountCents={report.salesAmountCents}
            accrualAmountCents={report.accrualAmountCents ?? null}
            accrualAppearanceCents={report.accrualAppearanceCents ?? null}
            accrualWorkCents={report.accrualWorkCents ?? null}
            acceptedByName={report.acceptedBy?.name?.trim() ? report.acceptedBy.name.trim() : null}
            isAdmin={Boolean(isAdmin)}
          />
        </div>
      </div>
    );
  } catch (e) {
    console.error("[reports/[id] render]", e);
    return <ServiceUnavailable scope={`reports/${id}`} />;
  }
}
