-- AlterTable
ALTER TABLE "RedemptionCodeUse" ALTER COLUMN "expiresAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Ruleset" ADD COLUMN     "packAllNightPriceCents" INTEGER NOT NULL DEFAULT 5000,
ADD COLUMN     "packPartyPriceCents" INTEGER NOT NULL DEFAULT 2500,
ADD COLUMN     "packQuickPriceCents" INTEGER NOT NULL DEFAULT 1000;
