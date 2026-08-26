import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatKst } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const matches = await prisma.match.findMany({
    include: {
      blueTeam: true,
      redTeam: true,
      _count: { select: { reactions: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  return (
    <main>
      <p className="page-lead">
        공식 중계가 아니라, 그 경기를 같이 본 방송인 다시보기입니다. 경기를 고르면 「이 경기 리액션 누가
        했지?」에 답합니다.
      </p>
      {matches.length === 0 ? (
        <p className="empty">등록된 경기가 없습니다. `npx prisma db seed`를 실행하세요.</p>
      ) : (
        <section className="match-list">
          {matches.map((match) => (
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
        </section>
      )}
    </main>
  );
}
