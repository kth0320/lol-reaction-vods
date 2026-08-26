-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "abbr" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TeamAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    CONSTRAINT "TeamAlias_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournament" TEXT NOT NULL,
    "split" TEXT NOT NULL,
    "bestOf" INTEGER NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "blueTeamId" TEXT NOT NULL,
    "redTeamId" TEXT NOT NULL,
    CONSTRAINT "Match_blueTeamId_fkey" FOREIGN KEY ("blueTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_redTeamId_fkey" FOREIGN KEY ("redTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ReactionVod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    CONSTRAINT "ReactionVod_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReactionVod_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamAlias_teamId_alias_key" ON "TeamAlias"("teamId", "alias");

-- CreateIndex
CREATE INDEX "ReactionVod_matchId_idx" ON "ReactionVod"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "ReactionVod_platform_externalId_key" ON "ReactionVod"("platform", "externalId");
