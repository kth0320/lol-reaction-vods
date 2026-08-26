import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatKst } from "@/lib/format";
import { creatorKindLabel, getPlayback, isPlatform, platformLabel } from "@/lib/playback";

export const dynamic = "force-dynamic";

function VodPlayer({
  platform,
  externalId,
  url,
}: {
  platform: string;
  externalId: string;
  url: string;
}) {
  if (!isPlatform(platform)) {
    return (
      <a className="button ghost" href={url} target="_blank" rel="noreferrer">
        원본 열기
      </a>
    );
  }

  const playback = getPlayback(platform, externalId, url);

  if (playback.mode === "link-out") {
    return (
      <div className="link-out">
        <p>치지직은 사이트 안에서 재생하지 않습니다. 원본 다시보기로 이동합니다. 인페이지 임베드는 후순위입니다.</p>
        <div className="button-row">
          <a className="button primary" href={playback.originalUrl} target="_blank" rel="noreferrer">
            치지직에서 보기
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="player-frame">
        <iframe
          src={playback.embedUrl}
          title={`${playback.label} 다시보기`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="button-row">
        <a className="button ghost" href={playback.originalUrl} target="_blank" rel="noreferrer">
          {playback.label} 원본 열기
        </a>
      </div>
    </>
  );
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      blueTeam: true,
      redTeam: true,
      reactions: {
        include: { creator: true },
        orderBy: { publishedAt: "asc" },
      },
    },
  });

  if (!match) {
    notFound();
  }

  return (
    <main>
      <Link href="/" className="back-link">
        ← 경기 목록
      </Link>
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
      <p className="page-lead">
        {match.blueTeam.name} vs {match.redTeam.name} 리액션 {match.reactions.length}개. YouTube·숲은 공식
        임베드, 치지직은 원본 링크입니다.
      </p>
      {match.reactions.length === 0 ? (
        <p className="empty">아직 연결된 리액션이 없습니다.</p>
      ) : (
        <section className="reaction-list">
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
        </section>
      )}
    </main>
  );
}
