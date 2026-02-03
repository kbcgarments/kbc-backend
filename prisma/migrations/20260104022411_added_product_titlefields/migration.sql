/*
  Warnings:

  - Added the required column `productTitle_en` to the `Testimonial` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "productTitle_en" TEXT NOT NULL,
ADD COLUMN     "productTitle_es" TEXT,
ADD COLUMN     "productTitle_fr" TEXT,
ADD COLUMN     "productTitle_zu" TEXT;
