/*
  Warnings:

  - You are about to drop the column `s3Key` on the `Media` table. All the data in the column will be lost.
  - Added the required column `originalKey` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- Rename s3Key to originalKey
ALTER TABLE "Media"
RENAME COLUMN "s3Key" TO "originalKey";

-- Add masterKey column (nullable)
ALTER TABLE "Media"
ADD COLUMN "masterKey" TEXT;