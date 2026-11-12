-- AlterTable
-- Prisma stored these instants in UTC: convert them as UTC, not in the session's TimeZone.
ALTER TABLE "lending"."Loan" ALTER COLUMN "borrowedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "borrowedAt" AT TIME ZONE 'UTC',
ALTER COLUMN "dueDate" SET DATA TYPE TIMESTAMPTZ(3) USING "dueDate" AT TIME ZONE 'UTC';
