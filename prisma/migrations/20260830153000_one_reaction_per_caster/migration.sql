DELETE FROM "ReactionVod"
WHERE (
  "title" LIKE '%대기방%'
  OR "title" LIKE '%시참%'
  OR "title" LIKE '%내전%'
  OR "title" LIKE '%생각정리%'
)
AND EXISTS (
  SELECT 1 FROM "ReactionVod" AS "other"
  WHERE "other"."matchId" = "ReactionVod"."matchId"
    AND "other"."creatorId" = "ReactionVod"."creatorId"
    AND "other"."platform" = "ReactionVod"."platform"
    AND "other"."id" != "ReactionVod"."id"
    AND "other"."title" NOT LIKE '%대기방%'
    AND "other"."title" NOT LIKE '%시참%'
    AND "other"."title" NOT LIKE '%내전%'
    AND "other"."title" NOT LIKE '%생각정리%'
);

DELETE FROM "ReactionVod"
WHERE id NOT IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "matchId", "creatorId", "platform"
        ORDER BY
          CASE WHEN "publishedAt" IS NULL THEN 0 ELSE 1 END DESC,
          "publishedAt" DESC,
          id DESC
      ) AS rn
    FROM "ReactionVod"
  ) AS ranked
  WHERE rn = 1
);

CREATE UNIQUE INDEX "ReactionVod_matchId_creatorId_platform_key" ON "ReactionVod"("matchId", "creatorId", "platform");
