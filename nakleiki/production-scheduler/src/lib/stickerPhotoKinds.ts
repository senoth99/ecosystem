export const StickerApplicationPhotoKind = {
  FRONT: "FRONT",
  BACK: "BACK",
  LEFT: "LEFT",
  RIGHT: "RIGHT"
} as const;

export type StickerApplicationPhotoKind =
  (typeof StickerApplicationPhotoKind)[keyof typeof StickerApplicationPhotoKind];

export const StickerDailyPhotoKind = {
  MAIN: "MAIN",
  CONTEXT: "CONTEXT"
} as const;

export type StickerDailyPhotoKind = (typeof StickerDailyPhotoKind)[keyof typeof StickerDailyPhotoKind];

