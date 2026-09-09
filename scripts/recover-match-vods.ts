/**
 * Recover missing reaction VODs for one ended match without hand-attaching.
 * 1) Backfill liveTitleHistory from leftover liveCandidate titles
 * 2) Scrape every chzzk/soop/youtube channel once against that match only
 */
import { attachTitleToOfficial } from "../lib/ingest/attach-live";
import {
  pickMatchesForVodWithLiveTitles,
  persistFieldsForMatch,
  shouldFetchSoopChapters,
  storedVodIsUnrelatedToMatch,
  withSoopChapterTitles,
  type VodAttachMatch,
} from "../lib/ingest/attach-vod";
import { mapPool } from "../lib/ingest/map-pool";
import { shouldFetchVods } from "../lib/ingest/platforms";
import { fetchSoopChapters, fetchVodsForChannel } from "../lib/ingest/vod-list";
import { matchAcceptsReactionVods } from "../lib/ingest/vod-window";
import { prisma } from "../lib/prisma";

const MATCH_ID = process.argv[2] ?? "schedule-117030752644841625";

function aliases(team: { abbr: string; name: string; aliases: { alias: string }[] }): string[] {
  return [team.abbr, team.name, ...team.aliases.map((row) => row.alias)];
}

function fetchConcurrencyFor(platform: string): number {
  if (platform === "youtube") return 8;
  return 4;
}

async function main() {
  const matchRow = await prisma.match.findUnique({
    where: { id: MATCH_ID },
    include: {
      blueTeam: { include: { aliases: true } },
      redTeam: { include: { aliases: true } },
    },
  });
  if (!matchRow) throw new Error(`match not found: ${MATCH_ID}`);
  if (!matchAcceptsReactionVods(matchRow.status)) {
    throw new Error(`match status ${matchRow.status} does not accept VODs yet`);
  }

  const match: VodAttachMatch = {
    id: matchRow.id,
    tournament: matchRow.tournament,
    status: matchRow.status,
    startsAt: matchRow.startsAt,
    bestOf: matchRow.bestOf,
    split: matchRow.split,
    blueTeamId: matchRow.blueTeamId,
    redTeamId: matchRow.redTeamId,
    blueAliases: aliases(matchRow.blueTeam),
    redAliases: aliases(matchRow.redTeam),
  };
  const attachable = [match];
  const official = [
    {
      id: matchRow.id,
      tournament: matchRow.tournament,
      blueTeamId: matchRow.blueTeamId,
      redTeamId: matchRow.redTeamId,
      status: matchRow.status,
      startsAt: matchRow.startsAt,
      blueTeam: matchRow.blueTeam,
      redTeam: matchRow.redTeam,
    },
  ];

  const candidates = await prisma.liveCandidate.findMany({
    select: { creatorId: true, platform: true, title: true },
  });
  let backfilled = 0;
  for (const row of candidates) {
    const title = row.title.trim();
    if (title.length < 4) continue;
    const hit = attachTitleToOfficial(title, official);
    if (!hit || hit.id !== MATCH_ID) continue;
    const exists = await prisma.liveTitleHistory.findFirst({
      where: { creatorId: row.creatorId, platform: row.platform, matchId: MATCH_ID },
    });
    if (exists) continue;
    await prisma.liveTitleHistory.create({
      data: {
        creatorId: row.creatorId,
        platform: row.platform,
        title,
        matchId: MATCH_ID,
        seenAt: matchRow.startsAt,
      },
    });
    backfilled += 1;
  }
  console.log(`memo backfill: ${backfilled}`);

  const before = await prisma.reactionVod.count({ where: { matchId: MATCH_ID } });
  const creators = await prisma.creator.findMany({
    where: { ingestEnabled: true },
    include: { channels: true },
  });
  const liveTitles = await prisma.liveTitleHistory.findMany({ orderBy: { seenAt: "desc" } });
  const historyByCreator = new Map<string, typeof liveTitles>();
  for (const row of liveTitles) {
    const list = historyByCreator.get(row.creatorId) ?? [];
    list.push(row);
    historyByCreator.set(row.creatorId, list);
  }

  const channels = creators.flatMap((creator) =>
    creator.channels
      .filter((channel) => shouldFetchVods(channel.platform))
      .map((channel) => ({ creator, channel })),
  );
  const byPlatform = new Map<string, typeof channels>();
  for (const row of channels) {
    const list = byPlatform.get(row.channel.platform) ?? [];
    list.push(row);
    byPlatform.set(row.channel.platform, list);
  }

  let scanned = 0;
  let attached = 0;

  async function scanChannel(
    creator: (typeof creators)[number],
    channel: (typeof creators)[number]["channels"][number],
  ) {
    let items = await fetchVodsForChannel(channel.platform, channel.channelId, fetch, { maxPages: 1 });
    scanned += items.length;
    if (items.length === 0) return;
    const history = historyByCreator.get(creator.id) ?? [];
    const needChapters = items.filter((item) =>
      shouldFetchSoopChapters(
        item,
        pickMatchesForVodWithLiveTitles(
          { title: item.title, publishedAt: item.publishedAt, platform: item.platform },
          history,
          attachable,
        ),
        attachable,
      ),
    );
    const chaptersById = new Map<string, Awaited<ReturnType<typeof fetchSoopChapters>>>();
    await mapPool(needChapters, fetchConcurrencyFor("soop"), async (item) => {
      chaptersById.set(item.externalId, await fetchSoopChapters(item.externalId));
    });

    for (const item of items) {
      const chapters = chaptersById.get(item.externalId);
      const row = chapters ? withSoopChapterTitles(item, chapters, attachable) : item;
      const hits = pickMatchesForVodWithLiveTitles(
        {
          title: row.title,
          publishedAt: row.publishedAt,
          platform: row.platform,
          extraTitles: row.extraTitles,
        },
        history,
        attachable,
      );
      for (const hitMatch of hits) {
        if (hitMatch.id !== MATCH_ID) continue;
        const fields = persistFieldsForMatch(row, match);
        if (storedVodIsUnrelatedToMatch(fields.title, match)) continue;
        const existing = await prisma.reactionVod.findUnique({
          where: {
            matchId_creatorId_platform: {
              matchId: MATCH_ID,
              creatorId: creator.id,
              platform: row.platform,
            },
          },
        });
        if (existing) continue;
        await prisma.reactionVod.create({
          data: {
            matchId: MATCH_ID,
            creatorId: creator.id,
            platform: row.platform,
            title: fields.title,
            url: fields.url,
            externalId: row.externalId,
            publishedAt: row.publishedAt,
          },
        });
        attached += 1;
      }
    }
  }

  await Promise.all(
    [...byPlatform.entries()].map(([platform, rows]) =>
      mapPool(rows, fetchConcurrencyFor(platform), async ({ creator, channel }) => {
        await scanChannel(creator, channel);
      }),
    ),
  );

  const after = await prisma.reactionVod.count({ where: { matchId: MATCH_ID } });
  console.log(
    `${matchRow.blueTeam.abbr} vs ${matchRow.redTeam.abbr}: scanned ${scanned} vods, newly attached ${attached} (${before} → ${after})`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
