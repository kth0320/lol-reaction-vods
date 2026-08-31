-- AlterTable
ALTER TABLE "Creator" ADD COLUMN "discovered" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LiveTitleHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "matchId" TEXT,
    "seenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveTitleHistory_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LiveTitleHistory_creatorId_platform_seenAt_idx" ON "LiveTitleHistory"("creatorId", "platform", "seenAt");
