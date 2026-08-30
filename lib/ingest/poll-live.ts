import { attachTitleToOfficial, type OfficialLiveMatch } from "@/lib/ingest/attach-live";
import { ensureCreatorCatalog } from "@/lib/ingest/creator-catalog";
import { isLivePollFresh, LIVE_POLL_FRESH_MS } from "@/lib/ingest/poll-fresh";
import { probeLive, type LiveProbe } from "@/lib/ingest/live-status";
import { prisma } from "@/lib/prisma";
import { ensureTeamCatalog } from "@/lib/ingest/team-catalog";
import { PROTOTYPE_LIVE_LEAGUES, isPrototypeLiveLeague } from "@/lib/leagues";
import { isLiveIngestPlatform } from "@/lib/ingest/platforms";
import { SCHEDULE_MATCH_SOURCE } from "@/lib/ingest/schedule-map";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";

export { attachTitleToOfficial, type OfficialLiveMatch };

export { LIVE_POLL_FRESH_MS };

const pollState = globalThis as unknown as {
  livePollInflight?: Promise<PollRow[]>;
  livePollAt?: number;
};

export type PollRow = {
  creatorId: string;
  creatorName: string;
  creatorKind: string;
  platform: string;
  channelId: string;
  url: string;
  isLive: boolean;
  title: string;
  matchId: string | null;
  matchLabel: string | null;
  error: string | null;
};

function matchLabel(match: { tournament: string; blueTeam: { abbr: string }; redTeam: { abbr: string } } | null): string | null {
  if (!match) return null;
  return `${match.tournament} ${match.blueTeam.abbr} vs ${match.redTeam.abbr}`;
}

async function lastPollMs(): Promise<number | null> {
  if (pollState.livePollAt) return pollState.livePollAt;
  const row = await prisma.liveCandidate.findFirst({
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });
  const ms = row?.fetchedAt.getTime() ?? null;
  if (ms) pollState.livePollAt = ms;
  return ms;
}

export async function refreshLiveCandidatesInBackground(maxAgeMs = LIVE_POLL_FRESH_MS): Promise<void> {
  try {
    await syncOfficialScheduleIfStale();
    await pollLiveCandidates({ maxAgeMs });
  } catch {
    // keep the last snapshot on the page
  }
}

export async function pollLiveCandidates(options: { maxAgeMs?: number | null } = {}): Promise<PollRow[]> {
  const maxAgeMs = options.maxAgeMs;
  if (pollState.livePollInflight) {
    return pollState.livePollInflight;
  }
  if (maxAgeMs != null && maxAgeMs >= 0) {
    const last = await lastPollMs();
    if (isLivePollFresh(last, Date.now(), maxAgeMs)) {
      return [];
    }
  }

  const work = runLivePoll()
    .then((rows) => {
      pollState.livePollAt = Date.now();
      return rows;
    })
    .finally(() => {
      if (pollState.livePollInflight === work) pollState.livePollInflight = undefined;
    });
  pollState.livePollInflight = work;
  return work;
}

async function runLivePoll(): Promise<PollRow[]> {
  await syncOfficialScheduleIfStale();
  await ensureCreatorCatalog();
  await ensureTeamCatalog();
  const creators = await prisma.creator.findMany({
    where: { ingestEnabled: true },
    include: { channels: true },
    orderBy: { name: "asc" },
  });
  const official = await prisma.match.findMany({
    where: {
      source: SCHEDULE_MATCH_SOURCE,
      status: { in: ["live", "upcoming"] },
      tournament: { in: [...PROTOTYPE_LIVE_LEAGUES] },
    },
    include: {
      blueTeam: { include: { aliases: true } },
      redTeam: { include: { aliases: true } },
    },
  });
  const officialLive = official.filter((match) => isPrototypeLiveLeague(match.tournament));

  type Draft = {
    creator: (typeof creators)[number];
    channel: (typeof creators)[number]["channels"][number];
    probe: LiveProbe | null;
    error: string | null;
    liveMatch: OfficialLiveMatch | null;
  };

  const drafts: Draft[] = await Promise.all(
    creators.flatMap((creator) =>
      creator.channels.filter((channel) => isLiveIngestPlatform(channel.platform)).map(async (channel) => {
        let probe: LiveProbe | null = null;
        let error: string | null = null;
        try {
          probe = await probeLive(channel.platform, channel.channelId, channel.url);
        } catch (caught) {
          error = caught instanceof Error ? caught.message : String(caught);
        }
        const title = probe?.title ?? "";
        const liveMatch = probe?.isLive && title ? attachTitleToOfficial(title, officialLive) : null;
        return { creator, channel, probe, error, liveMatch };
      }),
    ),
  );

  const rows: PollRow[] = [];
  for (const draft of drafts) {
    const { creator, channel, probe, error, liveMatch } = draft;
    const isLive = probe?.isLive ?? false;
    const title = probe?.title ?? "";
    const supportingTeamId =
      liveMatch &&
      (creator.defaultSupportingTeamId === liveMatch.blueTeamId || creator.defaultSupportingTeamId === liveMatch.redTeamId)
        ? creator.defaultSupportingTeamId
        : null;

    await prisma.liveCandidate.upsert({
      where: {
        creatorId_platform: { creatorId: creator.id, platform: channel.platform },
      },
      create: {
        creatorId: creator.id,
        platform: channel.platform,
        title: title || `${creator.name} ${isLive ? "LIVE" : "OFF"}`,
        url: probe?.liveUrl ?? channel.url,
        externalId: probe?.externalId ?? channel.channelId,
        matchId: liveMatch?.id ?? null,
        supportingTeamId,
        status: "candidate",
        isLive,
        fetchedAt: new Date(),
        viewerCount: probe?.viewerCount ?? null,
        imageUrl: probe?.imageUrl ?? "",
      },
      update: {
        title: title || `${creator.name} ${isLive ? "LIVE" : "OFF"}`,
        url: probe?.liveUrl ?? channel.url,
        externalId: probe?.externalId ?? channel.channelId,
        matchId: liveMatch?.id ?? null,
        supportingTeamId,
        status: "candidate",
        isLive,
        fetchedAt: new Date(),
        viewerCount: probe?.viewerCount ?? null,
        imageUrl: probe?.imageUrl ?? "",
      },
    });

    rows.push({
      creatorId: creator.id,
      creatorName: creator.name,
      creatorKind: creator.kind,
      platform: channel.platform,
      channelId: channel.channelId,
      url: probe?.liveUrl ?? channel.url,
      isLive,
      title,
      matchId: liveMatch?.id ?? null,
      matchLabel: matchLabel(liveMatch),
      error,
    });
  }

  return rows.sort((a, b) => a.creatorName.localeCompare(b.creatorName, "ko") || a.platform.localeCompare(b.platform));
}
