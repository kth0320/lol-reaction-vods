-- CreateTable
CREATE TABLE "CreatorChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    CONSTRAINT "CreatorChannel_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LiveCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "matchId" TEXT,
    "supportingTeamId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'candidate',
    "isLive" BOOLEAN NOT NULL DEFAULT true,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveCandidate_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiveCandidate_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LiveCandidate_supportingTeamId_fkey" FOREIGN KEY ("supportingTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Creator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ingestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultSupportingTeamId" TEXT,
    CONSTRAINT "Creator_defaultSupportingTeamId_fkey" FOREIGN KEY ("defaultSupportingTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Creator" ("id", "kind", "name") SELECT "id", "kind", "name" FROM "Creator";
DROP TABLE "Creator";
ALTER TABLE "new_Creator" RENAME TO "Creator";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CreatorChannel_creatorId_idx" ON "CreatorChannel"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorChannel_platform_channelId_key" ON "CreatorChannel"("platform", "channelId");

-- CreateIndex
CREATE INDEX "LiveCandidate_creatorId_idx" ON "LiveCandidate"("creatorId");

-- CreateIndex
CREATE INDEX "LiveCandidate_matchId_idx" ON "LiveCandidate"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveCandidate_platform_externalId_key" ON "LiveCandidate"("platform", "externalId");
