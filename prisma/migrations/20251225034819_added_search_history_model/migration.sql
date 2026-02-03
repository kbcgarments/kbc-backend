/*
  Warnings:

  - You are about to drop the column `userId` on the `SearchHistory` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[customerId,query]` on the table `SearchHistory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deviceId,query]` on the table `SearchHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SearchHistory_userId_query_key";

-- AlterTable
ALTER TABLE "SearchHistory" DROP COLUMN "userId",
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "deviceId" TEXT;

-- CreateIndex
CREATE INDEX "SearchHistory_customerId_idx" ON "SearchHistory"("customerId");

-- CreateIndex
CREATE INDEX "SearchHistory_deviceId_idx" ON "SearchHistory"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchHistory_customerId_query_key" ON "SearchHistory"("customerId", "query");

-- CreateIndex
CREATE UNIQUE INDEX "SearchHistory_deviceId_query_key" ON "SearchHistory"("deviceId", "query");
