-- DropIndex
DROP INDEX "Media_ownerId_status_createdAt_idx";

-- CreateIndex
CREATE INDEX "Media_ownerId_createdAt_id_status_idx" ON "Media"("ownerId", "createdAt" DESC, "id" DESC, "status");
