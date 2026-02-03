/*
  Warnings:

  - You are about to drop the column `cancellationDate` on the `Order` table. All the data in the column will be lost.
  - The `cancelledBy` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `nextDeliveryAttempt` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CancellationSource" AS ENUM ('CUSTOMER', 'ADMIN');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "cancellationDate",
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "refundCurrency" TEXT,
ADD COLUMN     "refundReference" TEXT,
DROP COLUMN "cancelledBy",
ADD COLUMN     "cancelledBy" "CancellationSource",
DROP COLUMN "nextDeliveryAttempt",
ADD COLUMN     "nextDeliveryAttempt" TIMESTAMP(3);
