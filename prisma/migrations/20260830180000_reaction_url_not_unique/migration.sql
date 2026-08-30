DROP INDEX "ReactionVod_platform_externalId_key";
CREATE INDEX "ReactionVod_platform_externalId_idx" ON "ReactionVod"("platform", "externalId");
