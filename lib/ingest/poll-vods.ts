import { ensureCreatorCatalog } from "@/lib/ingest/creator-catalog";
import { pickMatchForVod, type VodAttachMatch } from "@/lib/ingest/attach-vod";
import { shouldFetchVods } from "@/lib/ingest/platforms";
import { isLivePollFresh } from "@/lib/ingest/poll-fresh";
import { ensureTeamCatalog } from "@/lib/ingest/team-catalog";
import { fetchVodsForChannel, type VodListItem } from "@/lib/ingest/vod-list";
import { prisma } from "@/lib/prisma";
import { vodAttachTournaments } from "@/lib/vod-hub";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";

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

export async function pollReactionVods(options: { maxAgeMs?: number | null } = {}): Promise<VodPollSummary> {
  const maxAgeMs = options.maxAgeMs;
  if (pollState.vodPollInflight) return pollState.vodPollInflight;
  if (maxAgeMs != null && maxAgeMs >= 0 && isLivePollFresh(pollState.vodPollAt, Date.now(), maxAgeMs)) {
    return { scanned: 0, attached: 0, skippedTwitch: 0 };
  }

  const work = runVodPoll()
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

async function runVodPoll(): Promise<VodPollSummary> {
  await syncOfficialScheduleIfStale();
  await ensureCreatorCatalog();
  await ensureTeamCatalog();

  const [creators, matches] = await Promise.all([
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
  ]);

  const attachable: VodAttachMatch[] = matches.map((match) => ({
    id: match.id,
    tournament: match.tournament,
    status: match.status,
    startsAt: match.startsAt,
    bestOf: match.bestOf,
    blueTeamId: match.blueTeamId,
    redTeamId: match.redTeamId,
    blueAliases: aliases(match.blueTeam),
    redAliases: aliases(match.redTeam),
  }));

  let scanned = 0;
  let attached = 0;
  const skippedTwitch = creators.reduce(
    (count, creator) => count + creator.channels.filter((channel) => channel.platform === "twitch").length,
    0,
  );

  const jobs = creators.flatMap((creator) =>
    creator.channels.map(async (channel) => {
      if (!shouldFetchVods(channel.platform)) return [] as { creatorId: string; item: VodListItem; matchId: string }[];
      let items: VodListItem[] = [];
      try {
        items = await fetchVodsForChannel(channel.platform, channel.channelId);
      } catch {
        return [];
      }
      scanned += items.length;
      const hits: { creatorId: string; item: VodListItem; matchId: string }[] = [];
      for (const item of items) {
        const match = pickMatchForVod(item.title, item.publishedAt, attachable);
        if (!match) continue;
        hits.push({ creatorId: creator.id, item, matchId: match.id });
      }
      return hits;
    }),
  );

  const hits = (await Promise.all(jobs)).flat();
  for (const hit of hits) {
    await prisma.reactionVod.upsert({
      where: { platform_externalId: { platform: hit.item.platform, externalId: hit.item.externalId } },
      create: {
        matchId: hit.matchId,
        creatorId: hit.creatorId,
        platform: hit.item.platform,
        title: hit.item.title,
        url: hit.item.url,
        externalId: hit.item.externalId,
        publishedAt: hit.item.publishedAt,
      },
      update: {
        matchId: hit.matchId,
        creatorId: hit.creatorId,
        title: hit.item.title,
        url: hit.item.url,
        publishedAt: hit.item.publishedAt,
      },
    });
    attached += 1;
  }

  return { scanned, attached, skippedTwitch };
}
