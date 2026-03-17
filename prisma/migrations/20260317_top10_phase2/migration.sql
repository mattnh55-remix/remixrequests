-- Top 10 Phase 2

CREATE TYPE "Top10Bucket" AS ENUM ('GENERAL', 'ADULT');

ALTER TABLE "Song"
  ADD COLUMN "trackId" TEXT;

ALTER TABLE "Request"
  ADD COLUMN "top10Bucket" "Top10Bucket";

CREATE TABLE "Top10Entry" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "songId" TEXT NOT NULL,
  "bucket" "Top10Bucket" NOT NULL,
  "title" TEXT NOT NULL,
  "artist" TEXT NOT NULL,
  "artworkUrl" TEXT,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "upvotes" INTEGER NOT NULL DEFAULT 0,
  "downvotes" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER NOT NULL DEFAULT 0,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Top10Entry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Top10Entry_locationId_sessionId_bucket_songId_key"
  ON "Top10Entry"("locationId", "sessionId", "bucket", "songId");

CREATE INDEX "Song_locationId_trackId_idx" ON "Song"("locationId", "trackId");
CREATE INDEX "Request_sessionId_top10Bucket_idx" ON "Request"("sessionId", "top10Bucket");
CREATE INDEX "Top10Entry_locationId_sessionId_bucket_score_idx"
  ON "Top10Entry"("locationId", "sessionId", "bucket", "score");
CREATE INDEX "Top10Entry_locationId_sessionId_bucket_lastActivityAt_idx"
  ON "Top10Entry"("locationId", "sessionId", "bucket", "lastActivityAt");

ALTER TABLE "Top10Entry"
  ADD CONSTRAINT "Top10Entry_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Top10Entry"
  ADD CONSTRAINT "Top10Entry_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Top10Entry"
  ADD CONSTRAINT "Top10Entry_songId_fkey"
  FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Vote_requestId_emailHash_key";
CREATE INDEX "Vote_requestId_emailHash_idx" ON "Vote"("requestId", "emailHash");
