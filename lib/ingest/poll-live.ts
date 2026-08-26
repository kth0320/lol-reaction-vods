import { PROTOTYPE_LEAGUE } from "@/lib/creators";
import { probeLive, type LiveProbe } from "@/lib/ingest/live-status";
import { pickPrototypeLiveMatch, type TitleMatchInput } from "@/lib/ingest/match-title";
import { prisma } from "@/lib/prisma";

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

export async function pollLiveCandidates(): Promise<PollRow[]> {
  const [creators, liveMatches] = await Promise.all([
    prisma.creator.findMany({
      where: { ingestEnabled: true },
      include: { channels: true },
      orderBy: { name: "asc" },
    }),
    prisma.match.findMany({
      where: { status: "live", tournament: PROTOTYPE_LEAGUE },
      include: { blueTeam: { include: { aliases: true } }, redTeam: { include: { aliases: true } } },
    }),
  ]);

  const titleMatches: TitleMatchInput[] = liveMatches.map((match) => ({
    id: match.id,
    tournament: match.tournament,
    blueAliases: [match.blueTeam.name, match.blueTeam.abbr, ...match.blueTeam.aliases.map((row) => row.alias)],
    redAliases: [match.redTeam.name, match.redTeam.abbr, ...match.redTeam.aliases.map((row) => row.alias)],
  }));
  const matchById = new Map(liveMatches.map((match) => [match.id, match]));

  const rows: PollRow[] = [];

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

        const isLive = probe?.isLive ?? false;
        const title = probe?.title ?? "";
        const picked = isLive && title ? pickPrototypeLiveMatch(title, titleMatches) : null;
        const liveMatch = picked ? matchById.get(picked.id) ?? null : null;
        const supportingTeamId =
          liveMatch &&
          (creator.defaultSupportingTeamId === liveMatch.blueTeamId ||
            creator.defaultSupportingTeamId === liveMatch.redTeamId)
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
      }),
    ),
  );

  return rows.sort((a, b) => a.creatorName.localeCompare(b.creatorName, "ko") || a.platform.localeCompare(b.platform));
}
