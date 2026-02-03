-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminActivityType" ADD VALUE 'CURRENCY_RATE_CREATED';
ALTER TYPE "AdminActivityType" ADD VALUE 'CURRENCY_RATE_UPDATED';
ALTER TYPE "AdminActivityType" ADD VALUE 'CATEGORY_CREATED';
ALTER TYPE "AdminActivityType" ADD VALUE 'CATEGORY_UPDATED';
ALTER TYPE "AdminActivityType" ADD VALUE 'CATEGORY_DELETED';
ALTER TYPE "AdminActivityType" ADD VALUE 'ADMIN_CREATED';
ALTER TYPE "AdminActivityType" ADD VALUE 'ADMIN_ROLE_ASSIGNED';
ALTER TYPE "AdminActivityType" ADD VALUE 'ADMIN_LOGGED_IN';
