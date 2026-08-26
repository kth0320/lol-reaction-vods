-- AlterTable
ALTER TABLE "Team" ADD COLUMN "league" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'seed';
