-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('NEXT', 'PLAY_NOW');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('APPROVED', 'REJECTED', 'PLAYED');

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "artistKey" TEXT NOT NULL,
    "artworkUrl" TEXT,
    "explicit" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "type" "RequestType" NOT NULL DEFAULT 'NEXT',
    "status" "RequestStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayHistory" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "artistKey" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruleset" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "costRequest" INTEGER NOT NULL DEFAULT 1,
    "costUpvote" INTEGER NOT NULL DEFAULT 1,
    "costDownvote" INTEGER NOT NULL DEFAULT 1,
    "costPlayNow" INTEGER NOT NULL DEFAULT 5,
    "maxRequestsPerSession" INTEGER NOT NULL DEFAULT 1,
    "maxVotesPerSession" INTEGER NOT NULL DEFAULT 3,
    "minSecondsBetweenActions" INTEGER NOT NULL DEFAULT 10,
    "enforceArtistCooldown" BOOLEAN NOT NULL DEFAULT true,
    "enforceSongCooldown" BOOLEAN NOT NULL DEFAULT true,
    "artistCooldownMinutes" INTEGER NOT NULL DEFAULT 15,
    "songCooldownMinutes" INTEGER NOT NULL DEFAULT 120,
    "enableVoting" BOOLEAN NOT NULL DEFAULT true,
    "msgExplicit" TEXT NOT NULL DEFAULT 'Sorry — this song isn’t available here.',
    "msgAlreadyRequested" TEXT NOT NULL DEFAULT 'You’ve already made a request this session.',
    "msgArtistCooldown" TEXT NOT NULL DEFAULT 'Sorry — this artist has played in the last 15 minutes.',
    "msgSongCooldown" TEXT NOT NULL DEFAULT 'Sorry — this song has already been played in the last 2 hours.',
    "msgNoCredits" TEXT NOT NULL DEFAULT 'Not enough credits.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ruleset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");

-- CreateIndex
CREATE INDEX "Song_locationId_idx" ON "Song"("locationId");

-- CreateIndex
CREATE INDEX "Song_artistKey_idx" ON "Song"("artistKey");

-- CreateIndex
CREATE INDEX "Request_locationId_sessionId_idx" ON "Request"("locationId", "sessionId");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");

-- CreateIndex
CREATE INDEX "Vote_sessionId_emailHash_idx" ON "Vote"("sessionId", "emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_requestId_emailHash_key" ON "Vote"("requestId", "emailHash");

-- CreateIndex
CREATE INDEX "CreditLedger_locationId_emailHash_idx" ON "CreditLedger"("locationId", "emailHash");

-- CreateIndex
CREATE INDEX "PlayHistory_locationId_playedAt_idx" ON "PlayHistory"("locationId", "playedAt");

-- CreateIndex
CREATE INDEX "PlayHistory_locationId_artistKey_playedAt_idx" ON "PlayHistory"("locationId", "artistKey", "playedAt");

-- CreateIndex
CREATE INDEX "PlayHistory_locationId_songId_playedAt_idx" ON "PlayHistory"("locationId", "songId", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ruleset_locationId_key" ON "Ruleset"("locationId");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayHistory" ADD CONSTRAINT "PlayHistory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayHistory" ADD CONSTRAINT "PlayHistory_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruleset" ADD CONSTRAINT "Ruleset_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
