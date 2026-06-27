-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "platformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: every firm that exists before the trial system is grandfathered in
-- as fully ACTIVE so nothing gets locked out. New firms created via
-- registerCompany after this migration explicitly start as TRIAL.
UPDATE "Tenant" SET "status" = 'ACTIVE';

-- Designate the platform owner (cross-tenant /owner back-office access): the
-- first account ever registered, i.e. the founder. Deterministic and avoids
-- guessing an email. Re-point to another account later if needed.
UPDATE "User" SET "platformAdmin" = true
WHERE "id" = (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1
);
