/*
  Warnings:

  - You are about to drop the column `title` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `ctaText` on the `HeroSection` table. All the data in the column will be lost.
  - You are about to drop the column `headline` on the `HeroSection` table. All the data in the column will be lost.
  - You are about to drop the column `subheadline` on the `HeroSection` table. All the data in the column will be lost.
  - You are about to drop the column `quote` on the `Testimonial` table. All the data in the column will be lost.
  - You are about to drop the column `roleOrContext` on the `Testimonial` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `WhyChooseUs` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `WhyChooseUs` table. All the data in the column will be lost.
  - Added the required column `language` to the `CustomerFeedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `headline_en` to the `HeroSection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quote_en` to the `Testimonial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description_en` to the `WhyChooseUs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_en` to the `WhyChooseUs` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CustomerFeedback_orderId_idx";

-- DropIndex
DROP INDEX "ProductVariant_colorId_idx";

-- DropIndex
DROP INDEX "ProductVariant_productId_idx";

-- DropIndex
DROP INDEX "Testimonial_isActive_priority_idx";

-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "title",
ADD COLUMN     "title_en" TEXT,
ADD COLUMN     "title_es" TEXT,
ADD COLUMN     "title_fr" TEXT,
ADD COLUMN     "title_zu" TEXT;

-- AlterTable
ALTER TABLE "CustomerFeedback" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "HeroSection" DROP COLUMN "ctaText",
DROP COLUMN "headline",
DROP COLUMN "subheadline",
ADD COLUMN     "ctaText_en" TEXT,
ADD COLUMN     "ctaText_es" TEXT,
ADD COLUMN     "ctaText_fr" TEXT,
ADD COLUMN     "ctaText_zu" TEXT,
ADD COLUMN     "headline_en" TEXT NOT NULL,
ADD COLUMN     "headline_es" TEXT,
ADD COLUMN     "headline_fr" TEXT,
ADD COLUMN     "headline_zu" TEXT,
ADD COLUMN     "subheadline_en" TEXT,
ADD COLUMN     "subheadline_es" TEXT,
ADD COLUMN     "subheadline_fr" TEXT,
ADD COLUMN     "subheadline_zu" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerNote" TEXT;

-- AlterTable
ALTER TABLE "Testimonial" DROP COLUMN "quote",
DROP COLUMN "roleOrContext",
ADD COLUMN     "quote_en" TEXT NOT NULL,
ADD COLUMN     "quote_es" TEXT,
ADD COLUMN     "quote_fr" TEXT,
ADD COLUMN     "quote_zu" TEXT,
ADD COLUMN     "role_en" TEXT,
ADD COLUMN     "role_es" TEXT,
ADD COLUMN     "role_fr" TEXT,
ADD COLUMN     "role_zu" TEXT;

-- AlterTable
ALTER TABLE "WhyChooseUs" DROP COLUMN "description",
DROP COLUMN "title",
ADD COLUMN     "description_en" TEXT NOT NULL,
ADD COLUMN     "description_es" TEXT,
ADD COLUMN     "description_fr" TEXT,
ADD COLUMN     "description_zu" TEXT,
ADD COLUMN     "title_en" TEXT NOT NULL,
ADD COLUMN     "title_es" TEXT,
ADD COLUMN     "title_fr" TEXT,
ADD COLUMN     "title_zu" TEXT;

-- CreateIndex
CREATE INDEX "CustomerFeedback_language_idx" ON "CustomerFeedback"("language");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
