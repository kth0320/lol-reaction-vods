import { LiveCasterBoard } from "@/components/live-caster-board";
import { MatchTeams } from "@/components/match-teams";
import { WatchOutbound } from "@/components/vod-player";
import { VsCard } from "@/components/vs-card";
import { formatKst } from "@/lib/format";
import { refreshLiveCandidatesInBackground } from "@/lib/ingest/poll-live";
import { lookForEvent } from "@/lib/ingest/official-stream";
import { fetchLeagueArt, resolveMatchArt } from "@/lib/league-art";
import { usesLiveCandidates } from "@/lib/ingest/schedule-map";
import { isLeague } from "@/lib/leagues";
import { creatorKindLabel } from "@/lib/playback";
import { groupReactionsForWatch } from "@/lib/watch-links";
import { prisma } from "@/lib/prisma";
import { collapseReactionsBySlot } from "@/lib/ingest/reaction-slot";
import { vodMatchBack } from "@/lib/vod-filter";
import { isVodHubId, matchTournamentToHub } from "@/lib/vod-hub";
import { stageLabelForMatch } from "@/lib/vod-split";
import Link from "next/link";
import { after } from "next/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hub?: string; year?: string; stage?: string; q?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
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
      blueTeam: { include: { aliases: true } },
      redTeam: { include: { aliases: true } },
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
        include: { creator: { include: { channels: true } } },
        orderBy: { publishedAt: "asc" },
      },
    },
  });

  if (!match) {
    notFound();
  }

  const live = match.status === "live";
  const [look, leagueArt] = await Promise.all([
    live && match.externalEventId ? lookForEvent(match.externalEventId) : Promise.resolve(null),
    fetchLeagueArt(),
  ]);
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
  const hubId = query.hub && isVodHubId(query.hub) ? query.hub : matchTournamentToHub(match.tournament);
  const back = vodMatchBack(live, hubId, query.year, query.stage, query.q);
  const stageLabel = hubId ? stageLabelForMatch(hubId, match.split, match.startsAt) : match.split;
  const reactions = collapseReactionsBySlot(match.reactions, () => ({
    startsAt: match.startsAt,
    blueAliases: [match.blueTeam.abbr, match.blueTeam.name, ...match.blueTeam.aliases.map((row) => row.alias)],
    redAliases: [match.redTeam.abbr, match.redTeam.name, ...match.redTeam.aliases.map((row) => row.alias)],
  })).sort(
    (left, right) => (left.publishedAt?.getTime() ?? 0) - (right.publishedAt?.getTime() ?? 0),
  );
  const watchCards = groupReactionsForWatch(
    reactions.map((reaction) => ({
      id: reaction.id,
      creatorId: reaction.creatorId,
      creatorName: reaction.creator.name,
      creatorKind: reaction.creator.kind,
      platform: reaction.platform,
      title: reaction.title,
      url: reaction.url,
      publishedAt: reaction.publishedAt,
      channels: reaction.creator.channels,
    })),
  );

  return (
    <main>
      <Link href={back.href} className="back-link">
        {back.label}
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
            blueImageUrl: art.blueImageUrl,
            redAbbr: match.redTeam.abbr,
            redName: match.redTeam.name,
            redImageUrl: art.redImageUrl,
            leagueImageUrl: art.leagueImageUrl,
            broadcast: art.broadcast,
          }}
        />
      ) : (
        <>
          <div className="match-meta">
            <span>
              {match.tournament} · {stageLabel}
            </span>
            <span>BO{match.bestOf}</span>
            <span>{formatKst(match.startsAt)}</span>
          </div>
          <div className="ended-match-head">
            {art.leagueImageUrl ? (
              <img className="ended-league-mark" src={art.leagueImageUrl} alt="" />
            ) : null}
            <MatchTeams
              blueAbbr={match.blueTeam.abbr}
              redAbbr={match.redTeam.abbr}
              blueImageUrl={art.blueImageUrl}
              redImageUrl={art.redImageUrl}
            />
            <p className="ended-match-names">
              {match.blueTeam.name} vs {match.redTeam.name}
            </p>
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
      {!live ? (
        <section className="vod-section">
          <h2 className="section-title">다시보기</h2>
          <p className="page-lead">
            {match.blueTeam.name} vs {match.redTeam.name} 리액션 {reactions.length}개. 영상은 유튜브·숲·치지직에서
            봅니다.
          </p>
          {watchCards.length === 0 ? (
            <p className="empty">아직 연결된 리액션이 없습니다.</p>
          ) : (
            <div className="reaction-list">
              {watchCards.map((card) => (
                <article key={card.key} className="reaction-card">
                  <div className="reaction-head">
                    <div>
                      <h2 className="creator-name">{card.creatorName}</h2>
                      <p className="creator-kind">{creatorKindLabel(card.creatorKind)}</p>
                    </div>
                    <span className="platform-badge">{card.badge}</span>
                  </div>
                  <p className="reaction-title">{card.title}</p>
                  <WatchOutbound links={card.links} />
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
