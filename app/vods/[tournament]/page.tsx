import { VodMatchList, type VodMatchRow } from "@/components/vod-match-list";
import { formatKst, kstYear } from "@/lib/format";
import { refreshVodsInBackground } from "@/lib/ingest/poll-vods";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";
import { prisma } from "@/lib/prisma";
import { hubUsesLeagueSeasons, isVodHubId, vodHubCard, vodHubMatchWhere, vodHubSearchExample } from "@/lib/vod-hub";
import { leagueVodSeasons } from "@/lib/vod-season";
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
      blueTeam: { include: { aliases: true } },
      redTeam: { include: { aliases: true } },
      _count: { select: { reactions: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  const rows: VodMatchRow[] = matches.map((match) => ({
    id: match.id,
    tournament: match.tournament,
    split: match.split,
    bestOf: match.bestOf,
    startsAtLabel: formatKst(match.startsAt),
    seasonYear: kstYear(match.startsAt),
    blueAbbr: match.blueTeam.abbr,
    blueName: match.blueTeam.name,
    redAbbr: match.redTeam.abbr,
    redName: match.redTeam.name,
    reactionCount: match._count.reactions,
    blue: {
      abbr: match.blueTeam.abbr,
      name: match.blueTeam.name,
      aliases: match.blueTeam.aliases.map((row) => row.alias),
    },
    red: {
      abbr: match.redTeam.abbr,
      name: match.redTeam.name,
      aliases: match.redTeam.aliases.map((row) => row.alias),
    },
  }));

  return (
    <main>
      <Link href="/" className="back-link">
        ← 메인
      </Link>
      <h1 className="section-title">{card.label} 다시보기</h1>
      <p className="page-lead">
        {hubUsesLeagueSeasons(card.id)
          ? "시즌을 고르면 그해 중계·리액션 다시보기가 나옵니다. 팀 이름·약자로 검색할 수 있습니다."
          : "이 대회를 중계·리액션한 방송인 다시보기입니다. 경기를 고르면 플랫폼별 영상이 나옵니다. 팀 이름·약자로 검색할 수 있습니다."}
      </p>
      <VodMatchList
        matches={rows}
        searchExample={vodHubSearchExample(card.id)}
        seasons={hubUsesLeagueSeasons(card.id) ? leagueVodSeasons() : undefined}
      />
    </main>
  );
}
