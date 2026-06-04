import { StickerApplicationPhotoKind } from "@/lib/stickerPhotoKinds";

export const StickerApplicationStatus = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
} as const;

export type StickerApplicationStatusValue =
  (typeof StickerApplicationStatus)[keyof typeof StickerApplicationStatus];

const REQUIRED_PHOTO_KINDS = [
  StickerApplicationPhotoKind.FRONT,
  StickerApplicationPhotoKind.BACK,
  StickerApplicationPhotoKind.LEFT,
  StickerApplicationPhotoKind.RIGHT
] as const;

export function applicationHasAllPhotos(photos: { kind: string; path: string | null }[]): boolean {
  const uploaded = new Set(
    photos.filter((p) => p.path).map((p) => p.kind)
  );
  return REQUIRED_PHOTO_KINDS.every((k) => uploaded.has(k));
}

export function canEditApplicationStatus(status: string): boolean {
  return (
    status === StickerApplicationStatus.DRAFT ||
    status === StickerApplicationStatus.PENDING_REVIEW ||
    status === StickerApplicationStatus.REJECTED
  );
}

export function applicationStatusLabel(status: string): string | null {
  if (status === StickerApplicationStatus.PENDING_REVIEW) return "на модерации";
  if (status === StickerApplicationStatus.APPROVED) return "одобрено";
  if (status === StickerApplicationStatus.REJECTED) return "отклонено";
  return null;
}
