-- CreateEnum
CREATE TYPE "QueueItemStatus" AS ENUM ('QUEUED', 'LOADED', 'PLAYING', 'PLAYED', 'HELD', 'SKIPPED', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "QueueSourceType" AS ENUM ('REQUEST', 'HOUSE', 'INTERSTITIAL');

-- CreateEnum
CREATE TYPE "PlaybackEventType" AS ENUM ('QUEUED', 'INTRO_INSERTED', 'LOADED', 'PLAYING', 'PLAYED', 'SKIPPED', 'HELD', 'DROP_TRIGGERED');

-- CreateEnum
CREATE TYPE "AudioAssetCategory" AS ENUM ('REQUEST_SINGLE', 'REQUEST_BLOCK', 'BRANDING', 'RULES', 'GAME', 'MANUAL');

-- AlterTable
ALTER TABLE "Ruleset" ADD COLUMN     "blockRequestIntroEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "brandingDropMinSongsApart" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "hourlyRulesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxInsertsPer15Min" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "requestClusterThreshold" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "requestLookaheadWindow" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "singleRequestIntroEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "QueueItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "QueueItemStatus" NOT NULL DEFAULT 'QUEUED',
    "position" INTEGER NOT NULL,
    "sourceType" "QueueSourceType" NOT NULL DEFAULT 'REQUEST',
    "introAssigned" BOOLEAN NOT NULL DEFAULT false,
    "clusterId" TEXT,
    "loadedAt" TIMESTAMP(3),
    "playingAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybackEvent" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "queueItemId" TEXT,
    "type" "PlaybackEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaybackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioAsset" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "category" "AudioAssetCategory" NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "cooldownSongs" INTEGER,
    "cooldownMinutes" INTEGER,
    "randomWeight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QueueItem_requestId_key" ON "QueueItem"("requestId");

-- CreateIndex
CREATE INDEX "QueueItem_locationId_sessionId_position_idx" ON "QueueItem"("locationId", "sessionId", "position");

-- CreateIndex
CREATE INDEX "QueueItem_locationId_status_position_idx" ON "QueueItem"("locationId", "status", "position");

-- CreateIndex
CREATE INDEX "QueueItem_sessionId_status_position_idx" ON "QueueItem"("sessionId", "status", "position");

-- CreateIndex
CREATE INDEX "QueueItem_sourceType_status_idx" ON "QueueItem"("sourceType", "status");

-- CreateIndex
CREATE INDEX "PlaybackEvent_locationId_createdAt_idx" ON "PlaybackEvent"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaybackEvent_queueItemId_createdAt_idx" ON "PlaybackEvent"("queueItemId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaybackEvent_type_createdAt_idx" ON "PlaybackEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AudioAsset_locationId_category_active_idx" ON "AudioAsset"("locationId", "category", "active");

-- CreateIndex
CREATE INDEX "AudioAsset_locationId_name_idx" ON "AudioAsset"("locationId", "name");

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackEvent" ADD CONSTRAINT "PlaybackEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackEvent" ADD CONSTRAINT "PlaybackEvent_queueItemId_fkey" FOREIGN KEY ("queueItemId") REFERENCES "QueueItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
