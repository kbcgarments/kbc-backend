/*
  Warnings:

  - You are about to drop the column `refundReference` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[refundIdempotencyKey]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "refundReference";

-- CreateIndex
CREATE UNIQUE INDEX "Order_refundIdempotencyKey_key" ON "Order"("refundIdempotencyKey");
