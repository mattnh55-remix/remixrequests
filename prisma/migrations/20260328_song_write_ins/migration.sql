-- Song write-ins
CREATE TYPE "WriteInStatus" AS ENUM (
  'PENDING',
  'MATCHED',
  'APPROVED',
  'FULFILLED',
  'REJECTED',
  'UNAVAILABLE'
);

CREATE TABLE "SongWriteIn" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "sessionId" TEXT,
  "identityId" TEXT,
  "requestedArtist" TEXT NOT NULL,
  "requestedTitle" TEXT NOT NULL,
  "requestNotes" TEXT,
  "requestedByLabel" TEXT,
  "status" "WriteInStatus" NOT NULL DEFAULT 'PENDING',
  "matchedSongId" TEXT,
  "adminNotes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "unavailableAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SongWriteIn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SongWriteIn_locationId_status_createdAt_idx"
  ON "SongWriteIn"("locationId", "status", "createdAt");

CREATE INDEX "SongWriteIn_locationId_sessionId_status_idx"
  ON "SongWriteIn"("locationId", "sessionId", "status");

CREATE INDEX "SongWriteIn_locationId_identityId_createdAt_idx"
  ON "SongWriteIn"("locationId", "identityId", "createdAt");

CREATE INDEX "SongWriteIn_matchedSongId_idx"
  ON "SongWriteIn"("matchedSongId");

ALTER TABLE "SongWriteIn"
  ADD CONSTRAINT "SongWriteIn_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SongWriteIn"
  ADD CONSTRAINT "SongWriteIn_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SongWriteIn"
  ADD CONSTRAINT "SongWriteIn_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "Identity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SongWriteIn"
  ADD CONSTRAINT "SongWriteIn_matchedSongId_fkey"
  FOREIGN KEY ("matchedSongId") REFERENCES "Song"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
