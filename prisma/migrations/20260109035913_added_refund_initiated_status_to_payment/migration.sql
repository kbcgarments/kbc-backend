-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_INITIATED';

-- AlterTable
ALTER TABLE "Testimonial" ALTER COLUMN "productTitle_en" DROP NOT NULL;
