-- AlterTable
ALTER TABLE "items" ALTER COLUMN "drop_id" DROP NOT NULL;
ALTER TABLE "items" ADD COLUMN "notes" TEXT;

-- DropForeignKey
ALTER TABLE "items" DROP CONSTRAINT "items_drop_id_fkey";

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_drop_id_fkey" FOREIGN KEY ("drop_id") REFERENCES "drops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "item_photos" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_photos_item_id_idx" ON "item_photos"("item_id");

-- AddForeignKey
ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
