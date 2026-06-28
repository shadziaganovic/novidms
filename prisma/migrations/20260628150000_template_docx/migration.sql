-- AlterTable
ALTER TABLE "DocumentTemplate" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'TEXT',
ADD COLUMN "fileKey" TEXT;
