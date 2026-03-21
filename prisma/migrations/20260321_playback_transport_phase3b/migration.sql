-- Phase 3B: playback transport timing fields
ALTER TABLE "QueueItem"
ADD COLUMN IF NOT EXISTS "durationSec" INTEGER,
ADD COLUMN IF NOT EXISTS "expectedEndAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "QueueItem_locationId_status_expectedEndAt_idx"
ON "QueueItem"("locationId", "status", "expectedEndAt");

CREATE INDEX IF NOT EXISTS "QueueItem_sessionId_status_expectedEndAt_idx"
ON "QueueItem"("sessionId", "status", "expectedEndAt");
