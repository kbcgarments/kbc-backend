-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "lowStockAlertSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "outOfStockAlertSent" BOOLEAN NOT NULL DEFAULT false;
