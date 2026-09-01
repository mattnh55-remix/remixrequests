CREATE TABLE "GoogleBusinessConnection" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "googleAccount" TEXT NOT NULL,
    "googleLocation" TEXT NOT NULL,
    "displayName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleBusinessConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleBusinessConnection_locationId_key" ON "GoogleBusinessConnection"("locationId");
ALTER TABLE "GoogleBusinessConnection" ADD CONSTRAINT "GoogleBusinessConnection_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
