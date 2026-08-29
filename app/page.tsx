import { VodHubGrid } from "@/components/vod-hub";
import { LiveCarousel } from "@/components/live-carousel";
import type { LiveSlide } from "@/components/vs-card";
import { formatKst } from "@/lib/format";
import { lookForEvent } from "@/lib/ingest/official-stream";
import { refreshLiveCandidatesInBackground } from "@/lib/ingest/poll-live";
import { refreshVodsInBackground } from "@/lib/ingest/poll-vods";
import { SCHEDULE_MATCH_SOURCE } from "@/lib/ingest/schedule-map";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";
import { fetchLeagueArt, resolveMatchArt } from "@/lib/league-art";
import { PROTOTYPE_LIVE_LEAGUES, isLeague, isPrototypeLiveLeague, sortLiveMatchesByLeague } from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import { countHubStats } from "@/lib/vod-hub";
import { after } from "next/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await syncOfficialScheduleIfStale();
  after(() => {
    void refreshLiveCandidatesInBackground();
    void refreshVodsInBackground();
  });

  const [scheduleLive, vodRows] = await Promise.all([
    prisma.match.findMany({
      where: { status: "live", source: SCHEDULE_MATCH_SOURCE, tournament: { in: [...PROTOTYPE_LIVE_LEAGUES] } },
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
  const [looks, leagueArt] = await Promise.all([
    Promise.all(
      liveRows.map((match) =>
        match.externalEventId ? lookForEvent(match.externalEventId) : Promise.resolve(null),
      ),
    ),
    fetchLeagueArt(),
  ]);

  const slides: LiveSlide[] = liveRows.map((match, index) => {
    const look = looks[index];
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
  const vodStats = countHubStats(
    vodRows.map((row) => ({ tournament: row.tournament, reactionCount: row._count.reactions })),
  );

  return (
    <main>
      <p className="page-lead">
        위 카드는 LCK·LEC 공식 일정입니다. 카드 면은 공식 리그 마크와 팀 로고이고, 그 이미지가 없을 때만 공식 중계
        음소거를 씁니다. 카드를 누르면 그 경기를 중계 중인 방송인이 나옵니다. 아래 대회 카드를 누르면 그 대회
        다시보기입니다.
      </p>
      {slides.length === 0 ? (
        <p className="empty">지금은 생중계 중인 LCK · LEC 경기가 없습니다.</p>
      ) : (
        <LiveCarousel slides={slides} />
      )}
      <section className="vod-section">
        <h2 className="section-title">다시보기</h2>
        <p className="section-note">대회를 고르면 그 경기를 중계한 스트리머·BJ 다시보기가 나옵니다.</p>
        <VodHubGrid stats={vodStats} />
      </section>
    </main>
  );
}
