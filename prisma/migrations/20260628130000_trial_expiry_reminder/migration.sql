-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "notifyTrialExpiry" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "trialReminderSentAt" TIMESTAMP(3);
