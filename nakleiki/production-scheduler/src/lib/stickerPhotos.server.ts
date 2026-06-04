import path from "path";
import { existsSync, mkdirSync } from "fs";
import { getUploadsRoot } from "@/lib/workplaceReportPhoto";
import type { StickerApplicationPhotoKind, StickerDailyPhotoKind } from "@/lib/stickerPhotoKinds";

function applicationPhotoDiskPath(applicationId: string, kind: StickerApplicationPhotoKind): string {
  return path.join(getUploadsRoot(), "stickers", "applications", applicationId, `${kind}.jpg`);
}

export function getApplicationPhotoDiskPath(applicationId: string, kind: StickerApplicationPhotoKind): string {
  const p = applicationPhotoDiskPath(applicationId, kind);
  mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

export function resolveApplicationPhotoDiskPath(applicationId: string, kind: StickerApplicationPhotoKind): string | null {
  const primary = applicationPhotoDiskPath(applicationId, kind);
  if (existsSync(primary)) return primary;
  return null;
}

export function getApplicationPhotoApiPath(applicationId: string, kind: StickerApplicationPhotoKind): string {
  return `/api/stickers/application/photo?applicationId=${encodeURIComponent(applicationId)}&kind=${encodeURIComponent(kind)}`;
}

function dailyPhotoDiskPath(reportId: string, kind: StickerDailyPhotoKind): string {
  return path.join(getUploadsRoot(), "stickers", "daily", reportId, `${kind}.jpg`);
}

export function getDailyPhotoDiskPath(reportId: string, kind: StickerDailyPhotoKind): string {
  const p = dailyPhotoDiskPath(reportId, kind);
  mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

export function resolveDailyPhotoDiskPath(reportId: string, kind: StickerDailyPhotoKind): string | null {
  const primary = dailyPhotoDiskPath(reportId, kind);
  if (existsSync(primary)) return primary;
  return null;
}

export function getDailyPhotoApiPath(reportId: string, kind: StickerDailyPhotoKind): string {
  return `/api/stickers/daily/photo?reportId=${encodeURIComponent(reportId)}&kind=${encodeURIComponent(kind)}`;
}

