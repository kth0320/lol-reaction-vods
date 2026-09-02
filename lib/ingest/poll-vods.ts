import { ensureCreatorCatalog } from "@/lib/ingest/creator-catalog";
import { pickMatchesForVodWithLiveTitles, storedVodIsUnrelatedToMatch, type VodAttachMatch } from "@/lib/ingest/attach-vod";
import { shouldFetchVods } from "@/lib/ingest/platforms";
import { isLivePollFresh } from "@/lib/ingest/poll-fresh";
import { collapseReactionsBySlot, pickPreferredReaction } from "@/lib/ingest/reaction-slot";
import { ensureTeamCatalog } from "@/lib/ingest/team-catalog";
import { fetchVodsForChannel, type VodFetchOptions, type VodListItem } from "@/lib/ingest/vod-list";
import { prisma } from "@/lib/prisma";
import { vodAttachTournaments } from "@/lib/vod-hub";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";
import { matchAcceptsReactionVods } from "@/lib/ingest/vod-window";

export const VOD_POLL_FRESH_MS = 30 * 60 * 1000;

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

export async function refreshVodsInBackground(maxAgeMs = VOD_POLL_FRESH_MS): Promise<void> {
  try {
    await syncOfficialScheduleIfStale();
    await pollReactionVods({ maxAgeMs });
  } catch {
    // keep existing reactions
  }
}

export async function pollReactionVods(
  options: { maxAgeMs?: number | null; vods?: VodFetchOptions } = {},
): Promise<VodPollSummary> {
  const maxAgeMs = options.maxAgeMs;
  if (pollState.vodPollInflight) return pollState.vodPollInflight;
  if (maxAgeMs != null && maxAgeMs >= 0 && isLivePollFresh(pollState.vodPollAt, Date.now(), maxAgeMs)) {
    return { scanned: 0, attached: 0, skippedTwitch: 0 };
  }

  const work = runVodPoll(options.vods)
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

async function runVodPoll(vods: VodFetchOptions = {}): Promise<VodPollSummary> {
  await syncOfficialScheduleIfStale();
  await ensureCreatorCatalog();
  await ensureTeamCatalog();
  // Live rows are watch-now, not the archive. Ended-match VODs stay put.
  await prisma.reactionVod.deleteMany({ where: { match: { status: "live" } } });

  const [creators, matches, liveTitles] = await Promise.all([
    prisma.creator.findMany({
      where: { ingestEnabled: true },
      include: { channels: true },
    }),
    prisma.match.findMany({
      where: { status: { in: ["ended", "live"] }, tournament: { in: vodAttachTournaments() } },
      include: {
        blueTeam: { include: { aliases: true } },
        redTeam: { include: { aliases: true } },
      },
    }),
    prisma.liveTitleHistory.findMany({ orderBy: { seenAt: "desc" } }),
  ]);

  const attachable: VodAttachMatch[] = matches.map((match) => ({
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
  const historyByCreator = new Map<string, typeof liveTitles>();
  for (const row of liveTitles) {
    const list = historyByCreator.get(row.creatorId) ?? [];
    list.push(row);
    historyByCreator.set(row.creatorId, list);
  }

  let scanned = 0;
  let attached = 0;
  const skippedTwitch = creators.reduce(
    (count, creator) => count + creator.channels.filter((channel) => channel.platform === "twitch").length,
    0,
  );

  const jobs = creators.flatMap((creator) =>
    creator.channels.map(async (channel) => {
      const empty = { hits: [] as { creatorId: string; item: VodListItem; matchId: string }[] };
      if (!shouldFetchVods(channel.platform)) return empty;
      let items: VodListItem[] = [];
      try {
        items = await fetchVodsForChannel(channel.platform, channel.channelId, fetch, vods);
      } catch {
        return empty;
      }
      scanned += items.length;
      const history = historyByCreator.get(creator.id) ?? [];
      const hits: { creatorId: string; item: VodListItem; matchId: string }[] = [];
      for (const item of items) {
        for (const match of pickMatchesForVodWithLiveTitles(
          { title: item.title, publishedAt: item.publishedAt, platform: item.platform },
          history,
          attachable,
        )) {
          hits.push({ creatorId: creator.id, item, matchId: match.id });
        }
      }
      return { hits };
    }),
  );

  const scans = await Promise.all(jobs);
  const hits = scans.flatMap((scan) => scan.hits);
  const matchById = new Map(attachable.map((match) => [match.id, match]));
  const collapsed = collapseReactionsBySlot(
    hits.map((hit) => ({
      matchId: hit.matchId,
      creatorId: hit.creatorId,
      platform: hit.item.platform,
      title: hit.item.title,
      publishedAt: hit.item.publishedAt,
      externalId: hit.item.externalId,
      item: hit.item,
    })),
    (row) => matchById.get(row.matchId) ?? { startsAt: new Date(0), blueAliases: [], redAliases: [] },
  );

  for (const hit of collapsed) {
    const match = matchById.get(hit.matchId);
    if (!match || !matchAcceptsReactionVods(match.status)) continue;
    if (await saveReactionSlot(hit, match)) attached += 1;
  }

  await dedupeExistingSlots(matchById);
  await dropUnrelatedSessionVods(attachable);

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

async function saveReactionSlot(hit: SlotHit, match: VodAttachMatch): Promise<boolean> {
  const incoming = {
    title: hit.item.title,
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
        title: hit.item.title,
        url: hit.item.url,
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
      title: hit.item.title,
      url: hit.item.url,
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
