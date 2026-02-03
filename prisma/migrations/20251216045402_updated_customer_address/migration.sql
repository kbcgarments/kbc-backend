/*
  Warnings:

  - A unique constraint covering the columns `[customerId,addressHash]` on the table `CustomerAddress` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CustomerAddress_customerId_addressHash_key" ON "CustomerAddress"("customerId", "addressHash");
