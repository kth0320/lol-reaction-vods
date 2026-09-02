import { VodHubGrid } from "@/components/vod-hub";
import { LiveCarousel } from "@/components/live-carousel";
import type { LiveSlide } from "@/components/vs-card";
import { formatKst } from "@/lib/format";
import { lookForEvent } from "@/lib/ingest/official-stream";
import { refreshLiveCandidatesInBackground } from "@/lib/ingest/poll-live";
import { refreshVodsInBackground } from "@/lib/ingest/poll-vods";
import { SCHEDULE_MATCH_SOURCE } from "@/lib/ingest/schedule-map";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";
import {
  fetchLeagueArt,
  hasMatchupPlate,
  leagueArtForTournament,
  resolveMatchArt,
} from "@/lib/league-art";
import { pickLiveHubByLeague, type LiveHubKind } from "@/lib/live-hub";
import {
  PROTOTYPE_LIVE_LEAGUES,
  isLeague,
  isPrototypeLiveLeague,
  sortLiveMatchesByLeague,
} from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import { VOD_HUB_CARDS, countHubStats, hubTournamentForArt, type VodHubId } from "@/lib/vod-hub";
import { after } from "next/server";

export const dynamic = "force-dynamic";

type ScheduleMatch = Awaited<ReturnType<typeof loadScheduleMatches>>[number];

async function loadScheduleMatches(status: "live" | "upcoming") {
  return prisma.match.findMany({
    where: { status, source: SCHEDULE_MATCH_SOURCE, tournament: { in: [...PROTOTYPE_LIVE_LEAGUES] } },
    include: { blueTeam: true, redTeam: true },
    orderBy: { startsAt: "asc" },
  });
}

function toSlide(
  match: ScheduleMatch,
  kind: LiveHubKind,
  art: ReturnType<typeof resolveMatchArt>,
): LiveSlide {
  return {
    id: match.id,
    tournament: match.tournament as LiveSlide["tournament"],
    split: match.split,
    bestOf: match.bestOf,
    startsAtLabel: formatKst(match.startsAt),
    blueAbbr: match.blueTeam.abbr,
    blueName: match.blueTeam.name,
    blueImageUrl: art.blueImageUrl,
    redAbbr: match.redTeam.abbr,
    redName: match.redTeam.name,
    redImageUrl: art.redImageUrl,
    leagueImageUrl: art.leagueImageUrl,
    broadcast: kind === "live" ? art.broadcast : null,
    kind,
  };
}

function emptySlide(league: LiveSlide["tournament"], leagueImageUrl: string): LiveSlide {
  return {
    id: `hub-empty-${league}`,
    tournament: league,
    split: "",
    bestOf: 0,
    startsAtLabel: "",
    blueAbbr: "",
    blueName: "",
    redAbbr: "",
    redName: "",
    leagueImageUrl,
    kind: "empty",
  };
}

export default async function HomePage() {
  after(() => {
    void syncOfficialScheduleIfStale();
    void refreshLiveCandidatesInBackground();
    void refreshVodsInBackground();
  });

  const [scheduleLive, scheduleUpcoming, vodRows, leagueArt] = await Promise.all([
    loadScheduleMatches("live"),
    loadScheduleMatches("upcoming"),
    prisma.match.findMany({
      where: { status: "ended", reactions: { some: {} } },
      select: { tournament: true, _count: { select: { reactions: true } } },
    }),
    fetchLeagueArt(),
  ]);

  const liveRows = sortLiveMatchesByLeague(scheduleLive).filter(
    (match): match is typeof match & { tournament: LiveSlide["tournament"] } =>
      isLeague(match.tournament) && isPrototypeLiveLeague(match.tournament),
  );
  const upcomingRows = scheduleUpcoming.filter(
    (match): match is typeof match & { tournament: LiveSlide["tournament"] } =>
      isLeague(match.tournament) && isPrototypeLiveLeague(match.tournament),
  );
  const picked = pickLiveHubByLeague(liveRows, upcomingRows);
  const shown = PROTOTYPE_LIVE_LEAGUES.flatMap((league) => {
    const pick = picked[league];
    return pick ? [pick.match] : [];
  });
  const looks = await Promise.all(
    shown.map((match) => {
      if (!match.externalEventId) return Promise.resolve(null);
      if (
        hasMatchupPlate({
          leagueImageUrl: leagueArtForTournament(leagueArt, match.tournament),
          blueImageUrl: match.blueTeam.imageUrl,
          redImageUrl: match.redTeam.imageUrl,
        })
      ) {
        return Promise.resolve(null);
      }
      return lookForEvent(match.externalEventId);
    }),
  );
  const lookByMatchId = new Map(shown.map((match, index) => [match.id, looks[index]]));

  const slides: LiveSlide[] = PROTOTYPE_LIVE_LEAGUES.map((league) => {
    const pick = picked[league];
    if (!pick) return emptySlide(league, leagueArtForTournament(leagueArt, league));
    const look = lookByMatchId.get(pick.match.id);
    const art = resolveMatchArt({
      tournament: pick.match.tournament,
      leagueArt,
      eventLeagueImageUrl: look?.leagueImageUrl,
      eventBlueImageUrl: look?.blueImageUrl,
      eventRedImageUrl: look?.redImageUrl,
      storedBlueImageUrl: pick.match.blueTeam.imageUrl,
      storedRedImageUrl: pick.match.redTeam.imageUrl,
      broadcast: look?.broadcast,
    });
    return toSlide(pick.match, pick.kind, art);
  });

  const vodStats = countHubStats(
    vodRows.map((row) => ({ tournament: row.tournament, reactionCount: row._count.reactions })),
  );
  const hubArt = Object.fromEntries(
    VOD_HUB_CARDS.map((card) => [card.id, leagueArtForTournament(leagueArt, hubTournamentForArt(card.id))]),
  ) as Record<VodHubId, string>;

  return (
    <main>
      <LiveCarousel slides={slides} />
      <section className="vod-section">
        <h2 className="section-title">다시보기</h2>
        <VodHubGrid stats={vodStats} leagueArt={hubArt} />
      </section>
    </main>
  );
}
