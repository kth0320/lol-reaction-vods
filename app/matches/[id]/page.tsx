import { LiveCasterBoard } from "@/components/live-caster-board";
import { VodPlayer } from "@/components/vod-player";
import { VsCard } from "@/components/vs-card";
import { formatKst } from "@/lib/format";
import { refreshLiveCandidatesInBackground } from "@/lib/ingest/poll-live";
import { usesLiveCandidates } from "@/lib/ingest/schedule-map";
import { isLeague } from "@/lib/leagues";
import { creatorKindLabel, isPlatform, platformLabel } from "@/lib/playback";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { after } from "next/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  after(() => {
    void refreshLiveCandidatesInBackground();
  });
  const head = await prisma.match.findUnique({
    where: { id },
    select: { status: true, source: true },
  });
  if (!head) {
    notFound();
  }

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      blueTeam: true,
      redTeam: true,
      liveCasts: {
        include: { creator: true, supportingTeam: true },
        orderBy: { creator: { name: "asc" } },
      },
      liveCandidates: {
        where: { isLive: true },
        include: { creator: true, supportingTeam: true },
        orderBy: { creator: { name: "asc" } },
      },
      reactions: {
        include: { creator: true },
        orderBy: { publishedAt: "asc" },
      },
    },
  });

  if (!match) {
    notFound();
  }

  const live = match.status === "live";
  const liveCastViews = (usesLiveCandidates(match.source) ? match.liveCandidates : match.liveCasts).map((cast) => ({
    id: cast.id,
    creatorName: cast.creator.name,
    creatorKind: cast.creator.kind,
    platform: cast.platform,
    title: cast.title,
    url: cast.url,
    externalId: cast.externalId,
    supportingTeamId: cast.supportingTeamId,
    supportingTeamAbbr: cast.supportingTeam?.abbr ?? null,
    imageUrl: "imageUrl" in cast ? cast.imageUrl : "",
    viewerCount: "viewerCount" in cast ? cast.viewerCount : null,
  }));

  return (
    <main>
      <Link href="/" className="back-link">
        ← 메인
      </Link>
      {live && isLeague(match.tournament) ? (
        <VsCard
          slide={{
            id: match.id,
            tournament: match.tournament,
            split: match.split,
            bestOf: match.bestOf,
            startsAtLabel: formatKst(match.startsAt),
            blueAbbr: match.blueTeam.abbr,
            blueName: match.blueTeam.name,
            redAbbr: match.redTeam.abbr,
            redName: match.redTeam.name,
          }}
        />
      ) : (
        <>
          <div className="match-meta">
            <span>
              {match.tournament} {match.split}
            </span>
            <span>BO{match.bestOf}</span>
            <span>{formatKst(match.startsAt)}</span>
          </div>
          <div className="match-teams" style={{ margin: "16px 0 8px" }}>
            <p className="team-name">{match.blueTeam.abbr}</p>
            <span className="vs">VS</span>
            <p className="team-name right">{match.redTeam.abbr}</p>
          </div>
        </>
      )}
      {live ? (
        <LiveCasterBoard
          blue={{ id: match.blueTeam.id, abbr: match.blueTeam.abbr }}
          red={{ id: match.redTeam.id, abbr: match.redTeam.abbr }}
          casts={liveCastViews}
        />
      ) : null}
      {match.reactions.length > 0 || !live ? (
        <section className="vod-section">
          <h2 className="section-title">다시보기</h2>
          <p className="page-lead">
            {match.blueTeam.name} vs {match.redTeam.name} 리액션 {match.reactions.length}개. YouTube·숲은 공식
            임베드, 치지직은 원본 링크입니다.
          </p>
          {match.reactions.length === 0 ? (
            <p className="empty">아직 연결된 리액션이 없습니다.</p>
          ) : (
            <div className="reaction-list">
              {match.reactions.map((reaction) => (
                <article key={reaction.id} className="reaction-card">
                  <div className="reaction-head">
                    <div>
                      <h2 className="creator-name">{reaction.creator.name}</h2>
                      <p className="creator-kind">{creatorKindLabel(reaction.creator.kind)}</p>
                    </div>
                    <span className="platform-badge">
                      {isPlatform(reaction.platform) ? platformLabel(reaction.platform) : reaction.platform}
                    </span>
                  </div>
                  <p className="reaction-title">{reaction.title}</p>
                  <VodPlayer platform={reaction.platform} externalId={reaction.externalId} url={reaction.url} />
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
