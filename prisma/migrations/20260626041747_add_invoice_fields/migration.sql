-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "amount" DECIMAL(12,2),
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" TEXT;
