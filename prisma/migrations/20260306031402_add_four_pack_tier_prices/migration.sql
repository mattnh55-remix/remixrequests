/*
  Warnings:

  - You are about to drop the column `packAllNightPriceCents` on the `Ruleset` table. All the data in the column will be lost.
  - You are about to drop the column `packPartyPriceCents` on the `Ruleset` table. All the data in the column will be lost.
  - You are about to drop the column `packQuickPriceCents` on the `Ruleset` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Ruleset" DROP COLUMN "packAllNightPriceCents",
DROP COLUMN "packPartyPriceCents",
DROP COLUMN "packQuickPriceCents",
ADD COLUMN     "packTier1PriceCents" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "packTier2PriceCents" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "packTier3PriceCents" INTEGER NOT NULL DEFAULT 1500,
ADD COLUMN     "packTier4PriceCents" INTEGER NOT NULL DEFAULT 2000;
