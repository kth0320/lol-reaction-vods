import { LiveCarousel } from "@/components/live-carousel";
import type { LiveSlide } from "@/components/vs-card";
import { formatKst } from "@/lib/format";
import { refreshLiveCandidatesInBackground } from "@/lib/ingest/poll-live";
import { SCHEDULE_MATCH_SOURCE } from "@/lib/ingest/schedule-map";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";
import { PROTOTYPE_LIVE_LEAGUES, isLeague, isPrototypeLiveLeague, sortLiveMatchesByLeague } from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
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
      where: { status: "ended", source: "seed" },
      include: {
        blueTeam: true,
        redTeam: true,
        _count: { select: { reactions: true } },
      },
      orderBy: { startsAt: "desc" },
    }),
  ]);

  const liveRows = scheduleLive;

  const slides: LiveSlide[] = sortLiveMatchesByLeague(liveRows)
    .filter((match): match is typeof match & { tournament: LiveSlide["tournament"] } =>
      isLeague(match.tournament) && isPrototypeLiveLeague(match.tournament),
    )
    .map((match) => ({
      id: match.id,
      tournament: match.tournament,
      split: match.split,
      bestOf: match.bestOf,
      startsAtLabel: formatKst(match.startsAt),
      blueAbbr: match.blueTeam.abbr,
      blueName: match.blueTeam.name,
      redAbbr: match.redTeam.abbr,
      redName: match.redTeam.name,
    }));

  return (
    <main>
      <p className="page-lead">
        공식 중계가 아니라 방송인 라이브·다시보기입니다. 위 카드는 LCK·LEC 공식 일정입니다. 방송 제목은 중계진을
        그 경기에 붙일 때만 씁니다. 아래는 지난 경기 리액션입니다.
      </p>
      {slides.length === 0 ? (
        <p className="empty">지금은 생중계 중인 LCK · LEC 경기가 없습니다.</p>
      ) : (
        <LiveCarousel slides={slides} />
      )}
      <section className="vod-section">
        <h2 className="section-title">다시보기</h2>
        {vodRows.length === 0 ? (
          <p className="empty">등록된 다시보기가 없습니다. `npx prisma db seed`를 실행하세요.</p>
        ) : (
          <div className="match-list">
            {vodRows.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`} className="match-card">
                <div className="match-meta">
                  <span>
                    {match.tournament} {match.split}
                  </span>
                  <span>BO{match.bestOf}</span>
                  <span>{formatKst(match.startsAt)}</span>
                </div>
                <div className="match-teams">
                  <p className="team-name">{match.blueTeam.abbr}</p>
                  <span className="vs">VS</span>
                  <p className="team-name right">{match.redTeam.abbr}</p>
                </div>
                <div className="match-meta">
                  <span>
                    {match.blueTeam.name} vs {match.redTeam.name}
                  </span>
                  <span className="reaction-count">리액션 {match._count.reactions}개</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
