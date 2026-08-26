import { inferLiveMatchFromTitle, type InferredLiveMatch } from "@/lib/ingest/infer-match";
import { probeLive, type LiveProbe } from "@/lib/ingest/live-status";
import { prisma } from "@/lib/prisma";
import { ensureTeamCatalog } from "@/lib/ingest/team-catalog";

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

function bestOfFromTitle(title: string): number {
  if (/\bbo5\b/i.test(title)) return 5;
  if (/\bbo1\b/i.test(title)) return 1;
  return 3;
}

async function syncIngestMatches(inferred: Map<string, { match: InferredLiveMatch; title: string }>) {
  const liveIds = [...inferred.keys()];
  for (const item of inferred.values()) {
    const { match, title } = item;
    await prisma.match.upsert({
      where: { id: match.key },
      create: {
        id: match.key,
        tournament: match.league,
        split: "진행 중",
        bestOf: bestOfFromTitle(title),
        status: "live",
        startsAt: new Date(),
        blueTeamId: match.blueTeamId,
        redTeamId: match.redTeamId,
        source: "ingest",
      },
      update: {
        status: "live",
        split: "진행 중",
        bestOf: bestOfFromTitle(title),
        startsAt: new Date(),
        source: "ingest",
      },
    });
  }

  await prisma.match.updateMany({
    where: {
      source: "ingest",
      status: "live",
      ...(liveIds.length > 0 ? { id: { notIn: liveIds } } : {}),
    },
    data: { status: "ended" },
  });
}

export async function pollLiveCandidates(): Promise<PollRow[]> {
  const inferTeams = await ensureTeamCatalog();
  const creators = await prisma.creator.findMany({
    where: { ingestEnabled: true },
    include: { channels: true },
    orderBy: { name: "asc" },
  });

  type Draft = {
    creator: (typeof creators)[number];
    channel: (typeof creators)[number]["channels"][number];
    probe: LiveProbe | null;
    error: string | null;
    inferred: InferredLiveMatch | null;
  };

  const drafts: Draft[] = (
    await Promise.all(
      creators.flatMap((creator) =>
        creator.channels.map(async (channel) => {
          let probe: LiveProbe | null = null;
          let error: string | null = null;
          try {
            probe = await probeLive(channel.platform, channel.channelId, channel.url);
          } catch (caught) {
            error = caught instanceof Error ? caught.message : String(caught);
          }
          const title = probe?.title ?? "";
          const inferred = probe?.isLive && title ? inferLiveMatchFromTitle(title, inferTeams) : null;
          return { creator, channel, probe, error, inferred };
        }),
      ),
    )
  );

  const inferredLive = new Map<string, { match: InferredLiveMatch; title: string }>();
  for (const draft of drafts) {
    if (!draft.inferred || !draft.probe?.isLive) continue;
    if (!inferredLive.has(draft.inferred.key)) {
      inferredLive.set(draft.inferred.key, { match: draft.inferred, title: draft.probe.title });
    }
  }
  await syncIngestMatches(inferredLive);

  const liveMatches = await prisma.match.findMany({
    where: { id: { in: [...inferredLive.keys()] } },
    include: { blueTeam: true, redTeam: true },
  });
  const matchById = new Map(liveMatches.map((match) => [match.id, match]));

  const rows: PollRow[] = [];
  for (const draft of drafts) {
    const { creator, channel, probe, error, inferred } = draft;
    const isLive = probe?.isLive ?? false;
    const title = probe?.title ?? "";
    const liveMatch = inferred ? matchById.get(inferred.key) ?? null : null;
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
