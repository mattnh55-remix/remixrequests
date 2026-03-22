-- Safe additive patch for Phase 3C.
-- Use `npx prisma db push` first. This SQL is only a fallback if you need to patch manually.

ALTER TABLE "Song"
  ADD COLUMN IF NOT EXISTS "durationSec" INTEGER;

ALTER TABLE "QueueItem"
  ADD COLUMN IF NOT EXISTS "durationSec" INTEGER,
  ADD COLUMN IF NOT EXISTS "expectedEndAt" TIMESTAMP(3);

-- Optional backfill for interstitial queue rows if any already exist:
UPDATE "QueueItem"
SET "durationSec" = COALESCE("durationSec", 8)
WHERE "sourceType" = 'INTERSTITIAL' AND "durationSec" IS NULL;
