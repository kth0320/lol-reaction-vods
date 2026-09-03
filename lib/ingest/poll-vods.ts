import { ensureCreatorCatalog } from "@/lib/ingest/creator-catalog";
import {
  pickMatchesForVodWithLiveTitles,
  persistFieldsForMatch,
  keepStoredReplayUrl,
  keepStoredReplayTitle,
  shouldFetchSoopChapters,
  storedVodIsUnrelatedToMatch,
  withSoopChapterTitles,
  type VodAttachMatch,
} from "@/lib/ingest/attach-vod";
import { shouldFetchVods } from "@/lib/ingest/platforms";
import { isLivePollFresh } from "@/lib/ingest/poll-fresh";
import { extraTitlesForVod } from "@/lib/ingest/live-title-history";
import { collapseReactionsBySlot, pickPreferredReaction } from "@/lib/ingest/reaction-slot";
import { ensureTeamCatalog } from "@/lib/ingest/team-catalog";
import { fetchSoopChapters, fetchVodsForChannel, VOD_LIVE_PAGES, type VodFetchOptions, type VodListItem } from "@/lib/ingest/vod-list";
import { mapPool } from "@/lib/ingest/map-pool";
import { creatorIdsWaitingForReplay } from "@/lib/ingest/vod-poll-targets";
import { prisma } from "@/lib/prisma";
import { vodAttachTournaments } from "@/lib/vod-hub";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";
import { estimatedSeriesMs } from "@/lib/ingest/schedule-map";
import {
  VOD_RECENT_ENDED_MS,
  matchAcceptsReactionVods,
  matchBlocksVodIngest,
  matchEndedWithin,
} from "@/lib/ingest/vod-window";

export const VOD_POLL_FRESH_MS = 30 * 60 * 1000;
export const VOD_POLL_INTERVAL_MS = 30 * 60 * 1000;
export const VOD_FETCH_CONCURRENCY_BY_PLATFORM: Record<string, number> = {
  chzzk: 4,
  soop: 4,
  youtube: 8,
};

function fetchConcurrencyFor(platform: string): number {
  return VOD_FETCH_CONCURRENCY_BY_PLATFORM[platform] ?? 4;
}

function enqueueWrites() {
  let tail = Promise.resolve();
  return (work: () => Promise<number>) => {
    const run = tail.then(work, work);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

const pollState = globalThis as unknown as {
  vodPollInflight?: Promise<VodPollSummary>;
  vodPollAt?: number;
};

export type VodPollSummary = {
  scanned: number;
  attached: number;
  skippedTwitch: number;
};

function aliases(team: { abbr: string; name: string; aliases: { alias: string }[] }): string[] {
  return [team.abbr, team.name, ...team.aliases.map((row) => row.alias)];
}

async function recentEndedMatchesWaitingForVods(): Promise<boolean> {
  const rows = await prisma.liveTitleHistory.findMany({
    where: { matchId: { not: null } },
    distinct: ["matchId"],
    select: { matchId: true },
  });
  const ids = rows.flatMap((row) => (row.matchId ? [row.matchId] : []));
  if (ids.length === 0) return false;
  const matches = await prisma.match.findMany({
    where: { id: { in: ids }, status: "ended" },
    select: { id: true, status: true, startsAt: true, bestOf: true, _count: { select: { reactions: true } } },
  });
  return matches.some((match) => matchEndedWithin(match) && match._count.reactions === 0);
}

async function seriesOnAir(): Promise<boolean> {
  const rows = await prisma.match.findMany({
    where: { status: "live", tournament: { in: vodAttachTournaments() } },
    select: { status: true, startsAt: true, bestOf: true },
  });
  return rows.some((row) => matchBlocksVodIngest(row));
}

export async function refreshVodsInBackground(maxAgeMs = VOD_POLL_FRESH_MS): Promise<void> {
  try {
    await syncOfficialScheduleIfStale();
    // Mid-series the board runs on live rows. Replay ingest waits so it does not fight the live poll for SQLite.
    if (await seriesOnAir()) return;
    await pollReactionVods({ maxAgeMs, prune: false });
  } catch {
    // keep existing reactions
  }
}

export async function pollReactionVods(
  options: { maxAgeMs?: number | null; vods?: VodFetchOptions; prune?: boolean } = {},
): Promise<VodPollSummary> {
  const maxAgeMs = options.maxAgeMs;
  if (pollState.vodPollInflight) return pollState.vodPollInflight;
  const waiting = maxAgeMs != null && maxAgeMs >= 0 ? await recentEndedMatchesWaitingForVods() : false;
  if (!waiting && maxAgeMs != null && maxAgeMs >= 0 && isLivePollFresh(pollState.vodPollAt, Date.now(), maxAgeMs)) {
    return { scanned: 0, attached: 0, skippedTwitch: 0 };
  }

  const work = runVodPoll(options.vods, options.prune === true)
    .then((summary) => {
      pollState.vodPollAt = Date.now();
      return summary;
    })
    .finally(() => {
      if (pollState.vodPollInflight === work) pollState.vodPollInflight = undefined;
    });
  pollState.vodPollInflight = work;
  return work;
}

async function fetchChannelVods(
  platform: string,
  channelId: string,
  vods: VodFetchOptions,
): Promise<VodListItem[]> {
  try {
    return await fetchVodsForChannel(platform, channelId, fetch, vods);
  } catch {
    try {
      return await fetchVodsForChannel(platform, channelId, fetch, vods);
    } catch {
      return [];
    }
  }
}

async function runVodPoll(vods: VodFetchOptions = {}, prune = false): Promise<VodPollSummary> {
  await syncOfficialScheduleIfStale();
  await ensureCreatorCatalog();
  await ensureTeamCatalog();
  const recentOnly = (vods.maxPages ?? VOD_LIVE_PAGES) <= VOD_LIVE_PAGES;
  // Live rows are watch-now, not the archive. Ended-match VODs stay put.
  await prisma.reactionVod.deleteMany({ where: { match: { status: "live" } } });

  const recentStartFloor = new Date(Date.now() - VOD_RECENT_ENDED_MS - estimatedSeriesMs(5));
  const [creators, matches, liveTitles, attachedRows] = await Promise.all([
    prisma.creator.findMany({
      where: { ingestEnabled: true },
      include: { channels: true },
    }),
    prisma.match.findMany({
      where: recentOnly
        ? {
            status: "ended",
            tournament: { in: vodAttachTournaments() },
            startsAt: { gte: recentStartFloor },
          }
        : { status: { in: ["ended", "live"] }, tournament: { in: vodAttachTournaments() } },
      include: {
        blueTeam: { include: { aliases: true } },
        redTeam: { include: { aliases: true } },
      },
    }),
    prisma.liveTitleHistory.findMany({ orderBy: { seenAt: "desc" } }),
    prisma.reactionVod.findMany({ select: { creatorId: true, matchId: true } }),
  ]);

  const mapped: VodAttachMatch[] = matches.map((match) => ({
    id: match.id,
    tournament: match.tournament,
    status: match.status,
    startsAt: match.startsAt,
    bestOf: match.bestOf,
    split: match.split,
    blueTeamId: match.blueTeamId,
    redTeamId: match.redTeamId,
    blueAliases: aliases(match.blueTeam),
    redAliases: aliases(match.redTeam),
  }));
  const attachable = recentOnly ? mapped.filter((match) => matchEndedWithin(match)) : mapped;
  const historyByCreator = new Map<string, typeof liveTitles>();
  for (const row of liveTitles) {
    const list = historyByCreator.get(row.creatorId) ?? [];
    list.push(row);
    historyByCreator.set(row.creatorId, list);
  }

  const endedMatchIds = new Set(attachable.filter((match) => match.status === "ended").map((match) => match.id));
  const waitingIds = creatorIdsWaitingForReplay({
    liveTitles,
    endedMatchIds,
    attached: attachedRows,
  });
  const selected = recentOnly ? creators.filter((creator) => waitingIds.has(creator.id)) : creators;
  const matchById = new Map(attachable.map((match) => [match.id, match]));
  const writeHits = enqueueWrites();

  let scanned = 0;
  let attached = 0;
  const skippedTwitch = selected.reduce(
    (count, creator) => count + creator.channels.filter((channel) => channel.platform === "twitch").length,
    0,
  );

  const channels = selected.flatMap((creator) =>
    creator.channels.filter((channel) => shouldFetchVods(channel.platform)).map((channel) => ({ creator, channel })),
  );
  const byPlatform = new Map<string, typeof channels>();
  for (const row of channels) {
    const list = byPlatform.get(row.channel.platform) ?? [];
    list.push(row);
    byPlatform.set(row.channel.platform, list);
  }

  async function scanChannel(creator: (typeof selected)[number], channel: (typeof selected)[number]["channels"][number]) {
    const items = await fetchChannelVods(channel.platform, channel.channelId, vods);
    scanned += items.length;
    if (items.length === 0) return;
    const history = historyByCreator.get(creator.id) ?? [];
    const hits: SlotHit[] = [];
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
      const liveExtras = extraTitlesForVod({
        currentTitle: row.title,
        publishedAt: row.publishedAt,
        rows: history,
      }).filter((title) => title.trim() && title.trim() !== row.title.trim());
      const enriched = {
        ...row,
        extraTitles: [...new Set([...(row.extraTitles ?? []), ...liveExtras])],
      };
      for (const match of pickMatchesForVodWithLiveTitles(
        {
          title: enriched.title,
          publishedAt: enriched.publishedAt,
          platform: enriched.platform,
          extraTitles: enriched.extraTitles,
        },
        history,
        attachable,
      )) {
        hits.push({
          matchId: match.id,
          creatorId: creator.id,
          platform: enriched.platform,
          title: enriched.title,
          publishedAt: enriched.publishedAt,
          externalId: enriched.externalId,
          item: enriched,
        });
      }
    }
    const collapsed = collapseReactionsBySlot(hits, (row) => matchById.get(row.matchId) ?? { startsAt: new Date(0), blueAliases: [], redAliases: [] });
    attached += await writeHits(async () => {
      let added = 0;
      for (const hit of collapsed) {
        const match = matchById.get(hit.matchId);
        if (!match || !matchAcceptsReactionVods(match.status)) continue;
        if (await saveReactionSlot(hit, match, { createOnly: recentOnly })) added += 1;
      }
      return added;
    });
  }

  await Promise.all(
    [...byPlatform.entries()].map(([platform, rows]) =>
      mapPool(rows, fetchConcurrencyFor(platform), async ({ creator, channel }) => {
        await scanChannel(creator, channel);
      }),
    ),
  );

  if (!recentOnly) {
    await dedupeExistingSlots(matchById);
    if (prune) await dropUnrelatedSessionVods(attachable);
  }

  return { scanned, attached, skippedTwitch };
}

type SlotHit = {
  matchId: string;
  creatorId: string;
  platform: string;
  title: string;
  publishedAt: Date | null;
  externalId: string;
  item: VodListItem;
};

async function saveReactionSlot(
  hit: SlotHit,
  match: VodAttachMatch,
  options: { createOnly?: boolean } = {},
): Promise<boolean> {
  const fields = persistFieldsForMatch(hit.item, match);
  if (storedVodIsUnrelatedToMatch(fields.title, match)) return false;
  const incoming = {
    title: fields.title,
    publishedAt: hit.item.publishedAt,
    externalId: hit.item.externalId,
  };
  const slot = await prisma.reactionVod.findUnique({
    where: {
      matchId_creatorId_platform: {
        matchId: hit.matchId,
        creatorId: hit.creatorId,
        platform: hit.item.platform,
      },
    },
  });

  if (slot) {
    if (options.createOnly) return false;
    const winner = pickPreferredReaction(
      [
        { title: slot.title, publishedAt: slot.publishedAt, externalId: slot.externalId },
        incoming,
      ],
      match,
    );
    if (winner.externalId !== incoming.externalId) return false;
    await prisma.reactionVod.update({
      where: { id: slot.id },
      data: {
        title: keepStoredReplayTitle(slot.title, fields.title, match),
        url: keepStoredReplayUrl(slot.url, fields.url),
        externalId: hit.item.externalId,
        publishedAt: hit.item.publishedAt,
      },
    });
    return true;
  }

  await prisma.reactionVod.create({
    data: {
      matchId: hit.matchId,
      creatorId: hit.creatorId,
      platform: hit.item.platform,
      title: fields.title,
      url: fields.url,
      externalId: hit.item.externalId,
      publishedAt: hit.item.publishedAt,
    },
  });
  return true;
}

async function dedupeExistingSlots(matchById: Map<string, VodAttachMatch>): Promise<void> {
  const rows = await prisma.reactionVod.findMany();
  const kept = new Set(
    collapseReactionsBySlot(rows, (row) => {
      const match = matchById.get(row.matchId);
      if (match) return match;
      return { startsAt: row.publishedAt ?? new Date(0), blueAliases: [], redAliases: [] };
    }).map((row) => row.id),
  );
  const extra = rows.filter((row) => !kept.has(row.id)).map((row) => row.id);
  if (extra.length === 0) return;
  await prisma.reactionVod.deleteMany({ where: { id: { in: extra } } });
}

async function dropUnrelatedSessionVods(attachable: VodAttachMatch[]): Promise<void> {
  const byId = new Map(attachable.map((match) => [match.id, match]));
  const rows = await prisma.reactionVod.findMany({ select: { id: true, title: true, matchId: true } });
  const drop = rows
    .filter((row) => storedVodIsUnrelatedToMatch(row.title, byId.get(row.matchId) ?? null))
    .map((row) => row.id);
  if (drop.length === 0) return;
  await prisma.reactionVod.deleteMany({ where: { id: { in: drop } } });
}
