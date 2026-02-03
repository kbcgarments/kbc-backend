/*
  Warnings:

  - A unique constraint covering the columns `[customerId,providerRef]` on the table `CustomerPaymentMethod` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CustomerPaymentMethod_customerId_providerRef_key" ON "CustomerPaymentMethod"("customerId", "providerRef");
