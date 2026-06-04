import { existsSync, mkdirSync } from "fs";
import path from "path";
import type { ReportPhotoKind } from "@/lib/reportPhotoKinds";
import { isReportPhotoKind, REPORT_PHOTO_KINDS } from "@/lib/reportPhotoKinds";

/** Папка вне git и пересборки Next — на VPS обычно рядом с SQLite (`/data/app/uploads`). */
export function getUploadsRoot(): string {
  const fromEnv = process.env.UPLOADS_DIR?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (dbUrl.startsWith("file:")) {
    const dbPath = dbUrl.slice("file:".length);
    const absDb = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
    return path.join(path.dirname(absDb), "uploads");
  }
  return path.join(process.cwd(), "data", "uploads");
}

function reportPhotoFileName(shiftId: string, kind: ReportPhotoKind): string {
  return kind === "workplace" ? `${shiftId}.jpg` : `${shiftId}-${kind}.jpg`;
}

function reportPhotoDiskPath(shiftId: string, kind: ReportPhotoKind): string {
  return path.join(getUploadsRoot(), "reports", reportPhotoFileName(shiftId, kind));
}

export function getReportPhotoDiskPath(shiftId: string, kind: ReportPhotoKind = "workplace"): string {
  const p = reportPhotoDiskPath(shiftId, kind);
  mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

/** URL для `<img>` и БД — отдаётся через API с проверкой сессии. */
export function getReportPhotoApiPath(shiftId: string, kind: ReportPhotoKind = "workplace"): string {
  const q = new URLSearchParams({ shiftId, kind });
  return `/api/reports/workplace-photo?${q.toString()}`;
}

/** Где лежит файл: новая папка данных, затем legacy `public/uploads` (только workplace). */
export function resolveReportPhotoDiskPath(shiftId: string, kind: ReportPhotoKind = "workplace"): string | null {
  const primary = reportPhotoDiskPath(shiftId, kind);
  if (existsSync(primary)) return primary;
  if (kind === "workplace") {
    const legacy = path.join(process.cwd(), "public", "uploads", "reports", `${shiftId}.jpg`);
    if (existsSync(legacy)) return legacy;
  }
  return null;
}

export function resolveAllReportPhotoDiskPaths(shiftId: string): string[] {
  const paths: string[] = [];
  for (const kind of REPORT_PHOTO_KINDS) {
    const diskPath = resolveReportPhotoDiskPath(shiftId, kind.id);
    if (diskPath) paths.push(diskPath);
  }
  return paths;
}

export function normalizeReportPhotoPath(
  storedPath: string | null | undefined,
  shiftId: string,
  kind: ReportPhotoKind = "workplace"
): string | null {
  if (!storedPath?.trim()) return null;
  if (resolveReportPhotoDiskPath(shiftId, kind)) return getReportPhotoApiPath(shiftId, kind);
  return null;
}

export function parseReportPhotoKindFromUrl(url: string): ReportPhotoKind | null {
  try {
    const kind = new URL(url, "http://local").searchParams.get("kind");
    if (kind && isReportPhotoKind(kind)) return kind;
  } catch {
    /* ignore */
  }
  return "workplace";
}
