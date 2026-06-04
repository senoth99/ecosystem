-- Shop Scheduler: часы точки, QR по точкам, привязка сотрудников, фото отчёта, выручка

-- Zone
ALTER TABLE "Zone" ADD COLUMN "dayStartTime" TEXT NOT NULL DEFAULT '10:00';
ALTER TABLE "Zone" ADD COLUMN "dayEndTime" TEXT NOT NULL DEFAULT '22:00';
ALTER TABLE "Zone" ADD COLUMN "lunchStartTime" TEXT;
ALTER TABLE "Zone" ADD COLUMN "lunchEndTime" TEXT;
ALTER TABLE "Zone" ADD COLUMN "checkInQrToken" TEXT;
CREATE UNIQUE INDEX "Zone_checkInQrToken_key" ON "Zone"("checkInQrToken");

-- User ↔ Zone (несколько точек; в режиме одной точки не используется в UI)
CREATE TABLE "UserZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserZone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserZone_userId_zoneId_key" ON "UserZone"("userId", "zoneId");
CREATE INDEX "UserZone_userId_idx" ON "UserZone"("userId");
CREATE INDEX "UserZone_zoneId_idx" ON "UserZone"("zoneId");

-- Приход: к какой точке отметились
ALTER TABLE "WorkplaceArrival" ADD COLUMN "zoneId" TEXT;
CREATE INDEX "WorkplaceArrival_zoneId_idx" ON "WorkplaceArrival"("zoneId");

-- Отчёт: выручка и несколько фото
ALTER TABLE "ShiftReport" ADD COLUMN "salesAmountCents" INTEGER;
ALTER TABLE "ShiftReport" ADD COLUMN "photoInsidePath" TEXT;
ALTER TABLE "ShiftReport" ADD COLUMN "photoOutsidePath" TEXT;
ALTER TABLE "ShiftReport" ADD COLUMN "photoElectricalPanelPath" TEXT;
ALTER TABLE "ShiftReport" ADD COLUMN "photoClosingReceiptPath" TEXT;
