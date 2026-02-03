-- CreateEnum
CREATE TYPE "ProductContentType" AS ENUM ('DESCRIPTION', 'SHIPPING', 'REVIEWS', 'GENERAL');

-- CreateTable
CREATE TABLE "ProductContentSection" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "ProductContentType" NOT NULL,
    "title" TEXT,
    "content_en" TEXT NOT NULL,
    "content_fr" TEXT,
    "content_es" TEXT,
    "content_zu" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductContentSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductContentSection_productId_idx" ON "ProductContentSection"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductContentSection_productId_type_key" ON "ProductContentSection"("productId", "type");

-- AddForeignKey
ALTER TABLE "ProductContentSection" ADD CONSTRAINT "ProductContentSection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
