/*
  Warnings:

  - You are about to drop the column `cartToken` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `wishlistToken` on the `Wishlist` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[deviceId]` on the table `Cart` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deviceId]` on the table `Wishlist` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Cart_cartToken_key";

-- DropIndex
DROP INDEX "Wishlist_wishlistToken_key";

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "cartToken",
ADD COLUMN     "deviceId" TEXT;

-- AlterTable
ALTER TABLE "Wishlist" DROP COLUMN "wishlistToken",
ADD COLUMN     "deviceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Cart_deviceId_key" ON "Cart"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_deviceId_key" ON "Wishlist"("deviceId");
