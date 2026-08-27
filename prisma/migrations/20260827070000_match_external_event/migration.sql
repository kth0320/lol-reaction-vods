-- AlterTable
ALTER TABLE "Match" ADD COLUMN "externalEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Match_externalEventId_key" ON "Match"("externalEventId");
