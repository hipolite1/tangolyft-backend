/*
  Warnings:

  - You are about to drop the `DeliveryDetail` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'WAIVED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('PAY_ON_DROPOFF', 'PREPAID');

-- DropForeignKey
ALTER TABLE "DeliveryDetail" DROP CONSTRAINT "DeliveryDetail_tripId_fkey";

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "commitmentAmount" INTEGER,
ADD COLUMN     "commitmentReason" TEXT,
ADD COLUMN     "commitmentStatus" "CommitmentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "commitmentWaivedAt" TIMESTAMP(3),
ADD COLUMN     "commitmentWaivedBy" TEXT,
ADD COLUMN     "paymentMode" "PaymentMode" NOT NULL DEFAULT 'PAY_ON_DROPOFF';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isMerchant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "merchantTrusted" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "DeliveryDetail";
