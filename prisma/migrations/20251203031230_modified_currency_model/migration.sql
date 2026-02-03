/*
  Warnings:

  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[currency]` on the table `CurrencyRate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stock";

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRate_currency_key" ON "CurrencyRate"("currency");
