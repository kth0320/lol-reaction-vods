import { UpcomingBoard, type UpcomingSlot } from "@/components/upcoming-board";
import { VodHubGrid } from "@/components/vod-hub";
import { LiveCarousel } from "@/components/live-carousel";
import type { LiveSlide } from "@/components/vs-card";
import { formatKst } from "@/lib/format";
import { lookForEvent } from "@/lib/ingest/official-stream";
import { refreshLiveCandidatesInBackground } from "@/lib/ingest/poll-live";
import { refreshVodsInBackground } from "@/lib/ingest/poll-vods";
import { SCHEDULE_MATCH_SOURCE } from "@/lib/ingest/schedule-map";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";
import { fetchLeagueArt, leagueArtForTournament, resolveMatchArt } from "@/lib/league-art";
import {
  PROTOTYPE_LIVE_LEAGUES,
  isLeague,
  isPrototypeLiveLeague,
  pickNextMatchByLeague,
  sortLiveMatchesByLeague,
} from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import { VOD_HUB_CARDS, countHubStats, hubTournamentForArt, type VodHubId } from "@/lib/vod-hub";
import { after } from "next/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await syncOfficialScheduleIfStale();
  after(() => {
    void refreshLiveCandidatesInBackground();
    void refreshVodsInBackground();
  });

  const [scheduleLive, scheduleUpcoming, vodRows] = await Promise.all([
    prisma.match.findMany({
      where: { status: "live", source: SCHEDULE_MATCH_SOURCE, tournament: { in: [...PROTOTYPE_LIVE_LEAGUES] } },
      include: { blueTeam: true, redTeam: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.match.findMany({
      where: { status: "upcoming", source: SCHEDULE_MATCH_SOURCE, tournament: { in: [...PROTOTYPE_LIVE_LEAGUES] } },
      include: { blueTeam: true, redTeam: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.match.findMany({
      where: { status: "ended", reactions: { some: {} } },
      select: { tournament: true, _count: { select: { reactions: true } } },
    }),
  ]);

  const liveRows = sortLiveMatchesByLeague(scheduleLive).filter(
    (match): match is typeof match & { tournament: LiveSlide["tournament"] } =>
      isLeague(match.tournament) && isPrototypeLiveLeague(match.tournament),
  );
  const nextByLeague = pickNextMatchByLeague(scheduleUpcoming);
  const upcomingRows = PROTOTYPE_LIVE_LEAGUES.map((league) => nextByLeague[league]).filter(
    (match): match is NonNullable<typeof match> => Boolean(match),
  );
  const [liveLooks, upcomingLooks, leagueArt] = await Promise.all([
    Promise.all(
      liveRows.map((match) =>
        match.externalEventId ? lookForEvent(match.externalEventId) : Promise.resolve(null),
      ),
    ),
    liveRows.length === 0
      ? Promise.all(
          upcomingRows.map((match) =>
            match.externalEventId ? lookForEvent(match.externalEventId) : Promise.resolve(null),
          ),
        )
      : Promise.resolve([] as Awaited<ReturnType<typeof lookForEvent>>[]),
    fetchLeagueArt(),
  ]);

  const slides: LiveSlide[] = liveRows.map((match, index) => {
    const look = liveLooks[index];
    const art = resolveMatchArt({
      tournament: match.tournament,
      leagueArt,
      eventLeagueImageUrl: look?.leagueImageUrl,
      eventBlueImageUrl: look?.blueImageUrl,
      eventRedImageUrl: look?.redImageUrl,
      storedBlueImageUrl: match.blueTeam.imageUrl,
      storedRedImageUrl: match.redTeam.imageUrl,
      broadcast: look?.broadcast,
    });
    return {
      id: match.id,
      tournament: match.tournament,
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
      broadcast: art.broadcast,
    };
  });

  const lookByMatchId = new Map(upcomingRows.map((match, index) => [match.id, upcomingLooks[index]]));
  const upcomingSlots: UpcomingSlot[] = PROTOTYPE_LIVE_LEAGUES.map((league) => {
    const match = nextByLeague[league];
    if (!match) {
      return {
        league,
        matchId: null,
        startsAtLabel: null,
        blueAbbr: "",
        redAbbr: "",
        blueImageUrl: "",
        redImageUrl: "",
        leagueImageUrl: leagueArtForTournament(leagueArt, league),
      };
    }
    const look = lookByMatchId.get(match.id);
    const art = resolveMatchArt({
      tournament: match.tournament,
      leagueArt,
      eventLeagueImageUrl: look?.leagueImageUrl,
      eventBlueImageUrl: look?.blueImageUrl,
      eventRedImageUrl: look?.redImageUrl,
      storedBlueImageUrl: match.blueTeam.imageUrl,
      storedRedImageUrl: match.redTeam.imageUrl,
    });
    return {
      league,
      matchId: match.id,
      startsAtLabel: formatKst(match.startsAt),
      blueAbbr: match.blueTeam.abbr,
      redAbbr: match.redTeam.abbr,
      blueImageUrl: art.blueImageUrl,
      redImageUrl: art.redImageUrl,
      leagueImageUrl: art.leagueImageUrl,
    };
  });

  const vodStats = countHubStats(
    vodRows.map((row) => ({ tournament: row.tournament, reactionCount: row._count.reactions })),
  );
  const hubArt = Object.fromEntries(
    VOD_HUB_CARDS.map((card) => [card.id, leagueArtForTournament(leagueArt, hubTournamentForArt(card.id))]),
  ) as Record<VodHubId, string>;

  return (
    <main>
      {slides.length === 0 ? <UpcomingBoard slots={upcomingSlots} /> : <LiveCarousel slides={slides} />}
      <section className="vod-section">
        <h2 className="section-title">다시보기</h2>
        <VodHubGrid stats={vodStats} leagueArt={hubArt} />
      </section>
    </main>
  );
}
