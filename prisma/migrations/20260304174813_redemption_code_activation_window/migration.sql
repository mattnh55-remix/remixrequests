/*
  Warnings:

  - You are about to drop the column `sessionId` on the `RedemptionCode` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `RedemptionCodeUse` table. All the data in the column will be lost.
  - Added the required column `expiresAt` to the `RedemptionCodeUse` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RedemptionCode_locationId_sessionId_idx";

-- DropIndex
DROP INDEX "RedemptionCodeUse_locationId_sessionId_idx";

-- AlterTable
ALTER TABLE "CreditLedger" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RedemptionCode" DROP COLUMN "sessionId",
ADD COLUMN     "redeemWindowMinutes" INTEGER NOT NULL DEFAULT 120,
ALTER COLUMN "expiresAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RedemptionCodeUse" DROP COLUMN "sessionId",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "RedemptionCode_locationId_idx" ON "RedemptionCode"("locationId");

-- CreateIndex
CREATE INDEX "RedemptionCodeUse_locationId_idx" ON "RedemptionCodeUse"("locationId");

-- CreateIndex
CREATE INDEX "RedemptionCodeUse_expiresAt_idx" ON "RedemptionCodeUse"("expiresAt");
