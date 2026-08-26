import { LiveCarousel } from "@/components/live-carousel";
import type { LiveSlide } from "@/components/vs-card";
import { formatKst } from "@/lib/format";
import { pollLiveCandidates } from "@/lib/ingest/poll-live";
import { isLeague, sortLiveMatchesByLeague } from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    await pollLiveCandidates();
  } catch {
    // 조회가 실패해도 마지막 수집 결과로 화면은 연다.
  }

  const [ingestLive, vodRows] = await Promise.all([
    prisma.match.findMany({
      where: { status: "live", source: "ingest" },
      include: { blueTeam: true, redTeam: true },
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

  const liveRows = ingestLive;

  const slides: LiveSlide[] = sortLiveMatchesByLeague(liveRows)
    .filter((match): match is typeof match & { tournament: LiveSlide["tournament"] } => isLeague(match.tournament))
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
        공식 중계가 아니라 방송인 라이브·다시보기입니다. 위 카드는 화이트리스트가 지금 켠 제목에서 경기를 읽습니다.
        아래는 지난 경기 리액션입니다.
      </p>
      {slides.length === 0 ? (
        <p className="empty">지금은 생중계 중인 LCK · LPL · LEC 경기가 없습니다.</p>
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
