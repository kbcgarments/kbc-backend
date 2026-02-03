/*
  Warnings:

  - Added the required column `addressHash` to the `CustomerAddress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomerAddress" ADD COLUMN     "addressHash" TEXT NOT NULL,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;
