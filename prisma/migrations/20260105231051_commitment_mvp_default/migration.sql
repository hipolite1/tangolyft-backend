-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CommitmentStatus" ADD VALUE 'NOT_REQUIRED';
ALTER TYPE "CommitmentStatus" ADD VALUE 'APPROVED';
ALTER TYPE "CommitmentStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Trip" ALTER COLUMN "commitmentStatus" SET DEFAULT 'WAIVED';
