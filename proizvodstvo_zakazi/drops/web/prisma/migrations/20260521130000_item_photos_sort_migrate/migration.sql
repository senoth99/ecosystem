-- AlterTable
ALTER TABLE "item_photos" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "item_photos" ALTER COLUMN "original_name" DROP NOT NULL;

-- Ensure notes default on items
ALTER TABLE "items" ALTER COLUMN "notes" SET DEFAULT '';
UPDATE "items" SET "notes" = '' WHERE "notes" IS NULL;
ALTER TABLE "items" ALTER COLUMN "notes" SET NOT NULL;

-- Migrate legacy items.photo into item_photos
INSERT INTO "item_photos" ("id", "item_id", "filename", "original_name", "sort_order", "created_at")
SELECT gen_random_uuid()::text, "id", "photo", "photo", 0, "created_at"
FROM "items"
WHERE "photo" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "item_photos" ip WHERE ip."item_id" = "items"."id" AND ip."filename" = "items"."photo");
