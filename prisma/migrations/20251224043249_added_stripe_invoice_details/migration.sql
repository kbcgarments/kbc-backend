-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "invoiceHostedUrl" TEXT,
ADD COLUMN     "invoicePdfUrl" TEXT,
ADD COLUMN     "stripeInvoiceId" TEXT;
