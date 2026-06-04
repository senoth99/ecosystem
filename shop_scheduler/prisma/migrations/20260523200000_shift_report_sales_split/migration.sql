-- Split shift report sales into card and cash.
ALTER TABLE "ShiftReport" ADD COLUMN "salesAmountCardCents" INTEGER;
ALTER TABLE "ShiftReport" ADD COLUMN "salesAmountCashCents" INTEGER;
