-- CreateTable
CREATE TABLE "LiveCast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "supportingTeamId" TEXT,
    CONSTRAINT "LiveCast_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiveCast_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiveCast_supportingTeamId_fkey" FOREIGN KEY ("supportingTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournament" TEXT NOT NULL,
    "split" TEXT NOT NULL,
    "bestOf" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ended',
    "startsAt" DATETIME NOT NULL,
    "blueTeamId" TEXT NOT NULL,
    "redTeamId" TEXT NOT NULL,
    CONSTRAINT "Match_blueTeamId_fkey" FOREIGN KEY ("blueTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_redTeamId_fkey" FOREIGN KEY ("redTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("bestOf", "blueTeamId", "id", "redTeamId", "split", "startsAt", "tournament") SELECT "bestOf", "blueTeamId", "id", "redTeamId", "split", "startsAt", "tournament" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LiveCast_matchId_idx" ON "LiveCast"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveCast_matchId_creatorId_platform_key" ON "LiveCast"("matchId", "creatorId", "platform");
