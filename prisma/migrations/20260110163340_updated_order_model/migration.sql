/*
  Warnings:

  - You are about to drop the column `refundProcessedAt` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "refundProcessedAt",
ADD COLUMN     "refundIdempotencyKey" TEXT,
ADD COLUMN     "refundInitiatedAt" TIMESTAMP(3),
ADD COLUMN     "refundProviderId" TEXT,
ADD COLUMN     "refundStatus" TEXT;
