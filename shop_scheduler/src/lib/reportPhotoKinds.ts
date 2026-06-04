export const REPORT_PHOTO_KINDS = [
  { id: "inside", label: "Общее фото внутри" },
  { id: "workplace", label: "Фото рабочего места" },
  { id: "outside", label: "Фото магазина снаружи" },
  { id: "electrical", label: "Фото щитка электроники" },
  { id: "closing_receipt", label: "Чек закрытия" }
] as const;

export type ReportPhotoKind = (typeof REPORT_PHOTO_KINDS)[number]["id"];

export const isReportPhotoKind = (v: string): v is ReportPhotoKind =>
  REPORT_PHOTO_KINDS.some((k) => k.id === v);

export type ShiftReportPhotoRecord = {
  shiftId: string;
  photoInsidePath: string | null;
  workplacePhotoPath: string | null;
  photoOutsidePath: string | null;
  photoElectricalPanelPath: string | null;
  photoClosingReceiptPath: string | null;
};

export function getReportPhotoPathFromRecord(report: ShiftReportPhotoRecord, kind: ReportPhotoKind): string | null {
  switch (kind) {
    case "inside":
      return report.photoInsidePath;
    case "workplace":
      return report.workplacePhotoPath;
    case "outside":
      return report.photoOutsidePath;
    case "electrical":
      return report.photoElectricalPanelPath;
    case "closing_receipt":
      return report.photoClosingReceiptPath;
  }
}
