/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerIdLive` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerIdTest` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `customerRef` on the `CustomerPaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `paymentIntentId` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token]` on the table `CustomerPaymentMethod` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Customer_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeCustomerIdLive",
DROP COLUMN "stripeCustomerIdTest";

-- AlterTable
ALTER TABLE "CustomerPaymentMethod" DROP COLUMN "customerRef",
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingLine1" TEXT,
ADD COLUMN     "billingPostal" TEXT,
ADD COLUMN     "token" TEXT,
ALTER COLUMN "provider" SET DEFAULT 'flutterwave',
ALTER COLUMN "providerRef" DROP NOT NULL,
ALTER COLUMN "brand" DROP NOT NULL,
ALTER COLUMN "last4" DROP NOT NULL,
ALTER COLUMN "expMonth" DROP NOT NULL,
ALTER COLUMN "expYear" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "paymentIntentId",
ADD COLUMN     "flwId" TEXT,
ADD COLUMN     "flwStatus" TEXT,
ADD COLUMN     "txRef" TEXT,
ALTER COLUMN "paymentProvider" SET DEFAULT 'flutterwave';

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPaymentMethod_token_key" ON "CustomerPaymentMethod"("token");
