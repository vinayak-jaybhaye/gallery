-- CreateEnum
CREATE TYPE "UploadSource" AS ENUM ('file', 'streaming');

-- AlterTable
ALTER TABLE "UploadSession" ADD COLUMN     "source" "UploadSource" NOT NULL DEFAULT 'file';
