import { VodHubGrid } from "@/components/vod-hub";
import { LiveCarousel } from "@/components/live-carousel";
import type { LiveSlide } from "@/components/vs-card";
import { formatKst } from "@/lib/format";
import { backgroundForEvent } from "@/lib/ingest/official-stream";
import { refreshLiveCandidatesInBackground } from "@/lib/ingest/poll-live";
import { SCHEDULE_MATCH_SOURCE } from "@/lib/ingest/schedule-map";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";
import { PROTOTYPE_LIVE_LEAGUES, isLeague, isPrototypeLiveLeague, sortLiveMatchesByLeague } from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import { countReactionsByHub } from "@/lib/vod-hub";
import { after } from "next/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await syncOfficialScheduleIfStale();
  after(() => {
    void refreshLiveCandidatesInBackground();
  });

  const [scheduleLive, vodRows] = await Promise.all([
    prisma.match.findMany({
      where: { status: "live", source: SCHEDULE_MATCH_SOURCE, tournament: { in: [...PROTOTYPE_LIVE_LEAGUES] } },
      include: { blueTeam: true, redTeam: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.match.findMany({
      where: { status: "ended" },
      select: { tournament: true, _count: { select: { reactions: true } } },
    }),
  ]);

  const liveRows = sortLiveMatchesByLeague(scheduleLive).filter(
    (match): match is typeof match & { tournament: LiveSlide["tournament"] } =>
      isLeague(match.tournament) && isPrototypeLiveLeague(match.tournament),
  );
  const broadcasts = await Promise.all(
    liveRows.map((match) => (match.externalEventId ? backgroundForEvent(match.externalEventId) : Promise.resolve(null))),
  );

  const slides: LiveSlide[] = liveRows.map((match, index) => ({
    id: match.id,
    tournament: match.tournament,
    split: match.split,
    bestOf: match.bestOf,
    startsAtLabel: formatKst(match.startsAt),
    blueAbbr: match.blueTeam.abbr,
    blueName: match.blueTeam.name,
    blueImageUrl: match.blueTeam.imageUrl,
    redAbbr: match.redTeam.abbr,
    redName: match.redTeam.name,
    redImageUrl: match.redTeam.imageUrl,
    broadcast: broadcasts[index],
  }));
  const vodCounts = countReactionsByHub(
    vodRows.map((row) => ({ tournament: row.tournament, reactionCount: row._count.reactions })),
  );

  return (
    <main>
      <p className="page-lead">
        위 카드는 LCK·LEC 공식 일정입니다. 배경은 공식 중계 음소거 프리뷰이고, 카드를 누르면 그 경기를 중계 중인
        방송인이 나옵니다. 아래 대회 카드를 누르면 그 대회 다시보기입니다.
      </p>
      {slides.length === 0 ? (
        <p className="empty">지금은 생중계 중인 LCK · LEC 경기가 없습니다.</p>
      ) : (
        <LiveCarousel slides={slides} />
      )}
      <section className="vod-section">
        <h2 className="section-title">다시보기</h2>
        <p className="section-note">대회를 고르면 그 경기를 중계한 스트리머·BJ 다시보기가 나옵니다.</p>
        <VodHubGrid counts={vodCounts} />
      </section>
    </main>
  );
}
