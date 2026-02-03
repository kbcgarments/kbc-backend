/*
  Warnings:

  - A unique constraint covering the columns `[wishlistToken]` on the table `Wishlist` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Wishlist" DROP CONSTRAINT "Wishlist_customerId_fkey";

-- AlterTable
ALTER TABLE "Wishlist" ADD COLUMN     "wishlistToken" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_wishlistToken_key" ON "Wishlist"("wishlistToken");

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
