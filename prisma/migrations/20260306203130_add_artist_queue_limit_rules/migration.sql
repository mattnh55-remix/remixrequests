-- AlterTable
ALTER TABLE "Ruleset" ADD COLUMN     "maxArtistInQueue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "msgArtistAlreadyQueued" TEXT NOT NULL DEFAULT 'Sorry, $artist is already queued up on the request list!';
