-- AlterTable
ALTER TABLE "AdminActivityLog" ADD COLUMN     "activityType" "AdminActivityType";

-- CreateIndex
CREATE INDEX "AdminActivityLog_entity_idx" ON "AdminActivityLog"("entity");

-- CreateIndex
CREATE INDEX "AdminActivityLog_activityType_idx" ON "AdminActivityLog"("activityType");

-- CreateIndex
CREATE INDEX "AdminActivityLog_entityId_idx" ON "AdminActivityLog"("entityId");

-- CreateIndex
CREATE INDEX "AdminActivityLog_createdAt_idx" ON "AdminActivityLog"("createdAt");
