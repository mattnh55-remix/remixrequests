/*
  Warnings:

  - You are about to drop the column `sessionId` on the `PendingCheckout` table. All the data in the column will be lost.
  - Added the required column `identityId` to the `PendingCheckout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PendingCheckout" DROP COLUMN "sessionId",
ADD COLUMN     "identityId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "PendingCheckout_identityId_idx" ON "PendingCheckout"("identityId");

-- AddForeignKey
ALTER TABLE "PendingCheckout" ADD CONSTRAINT "PendingCheckout_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
