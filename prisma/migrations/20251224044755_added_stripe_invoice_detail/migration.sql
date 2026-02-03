/*
  Warnings:

  - You are about to drop the column `invoiceHostedUrl` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `invoicePdfUrl` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `stripeInvoiceId` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "invoiceHostedUrl",
DROP COLUMN "invoicePdfUrl",
DROP COLUMN "stripeInvoiceId",
ADD COLUMN     "receiptUrl" TEXT;
