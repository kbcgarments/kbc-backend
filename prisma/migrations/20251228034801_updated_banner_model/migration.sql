/*
  Warnings:

  - You are about to drop the column `link` on the `Banner` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "link",
ADD COLUMN     "ctaLink" TEXT,
ADD COLUMN     "ctaText_en" TEXT,
ADD COLUMN     "ctaText_es" TEXT,
ADD COLUMN     "ctaText_fr" TEXT,
ADD COLUMN     "ctaText_zu" TEXT,
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "description_es" TEXT,
ADD COLUMN     "description_fr" TEXT,
ADD COLUMN     "description_zu" TEXT;
