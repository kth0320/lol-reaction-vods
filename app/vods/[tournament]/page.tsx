import { formatKst } from "@/lib/format";
import { refreshVodsInBackground } from "@/lib/ingest/poll-vods";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";
import { prisma } from "@/lib/prisma";
import { isVodHubId, vodHubCard, vodHubMatchWhere } from "@/lib/vod-hub";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";

export const dynamic = "force-dynamic";

export default async function VodHubPage({ params }: { params: Promise<{ tournament: string }> }) {
  const { tournament } = await params;
  if (!isVodHubId(tournament)) {
    notFound();
  }
  const card = vodHubCard(tournament);
  if (!card) {
    notFound();
  }

  await syncOfficialScheduleIfStale();
  after(() => {
    void refreshVodsInBackground();
  });

  const matches = await prisma.match.findMany({
    where: vodHubMatchWhere(tournament),
    include: {
      blueTeam: true,
      redTeam: true,
      _count: { select: { reactions: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  return (
    <main>
      <Link href="/" className="back-link">
        ← 메인
      </Link>
      <h1 className="section-title">{card.label} 다시보기</h1>
      <p className="page-lead">이 대회를 중계·리액션한 방송인 다시보기입니다. 경기를 고르면 플랫폼별 영상이 나옵니다.</p>
      {matches.length === 0 ? (
        <p className="empty">아직 이 대회 다시보기가 없습니다. YouTube 수집이 붙으면 여기에 쌓입니다.</p>
      ) : (
        <div className="match-list">
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
        </div>
      )}
    </main>
  );
}
