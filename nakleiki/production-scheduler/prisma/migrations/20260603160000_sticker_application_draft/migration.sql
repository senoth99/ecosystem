-- Черновик до нажатия «Отправить заявку»; submittedAt — момент отправки на модерацию
ALTER TABLE "StickerApplication" ADD COLUMN "submittedAt" DATETIME;

UPDATE "StickerApplication"
SET "status" = 'DRAFT'
WHERE "status" = 'PENDING_REVIEW' AND "submittedAt" IS NULL;
