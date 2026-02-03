/*
  Warnings:

  - Changed the type of `currency` on the `CurrencyRate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP', 'NGN', 'ZAR');

-- AlterTable
ALTER TABLE "CurrencyRate" DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRate_currency_key" ON "CurrencyRate"("currency");
