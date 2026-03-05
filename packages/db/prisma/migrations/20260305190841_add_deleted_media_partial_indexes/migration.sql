-- CreateIndex
CREATE INDEX "Media_ownerId_deletedAt_id_idx" ON "Media"("ownerId", "deletedAt" DESC, "id") WHERE ("deletedAt" IS NOT NULL);
