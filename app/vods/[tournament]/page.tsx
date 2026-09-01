import { VodMatchList, type VodMatchRow } from "@/components/vod-match-list";
import { formatKst, kstYear } from "@/lib/format";
import { syncOfficialScheduleIfStale } from "@/lib/ingest/sync-schedule";
import { parseVodFilter } from "@/lib/vod-filter";
import { prisma } from "@/lib/prisma";
import { hubUsesLeagueSeasons, isVodHubId, vodHubCard, vodHubMatchWhere, vodHubSearchExample } from "@/lib/vod-hub";
import { hubYearFilter } from "@/lib/vod-season";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";

export const dynamic = "force-dynamic";

export default async function VodHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournament: string }>;
  searchParams: Promise<{ year?: string; stage?: string; q?: string }>;
}) {
  const { tournament } = await params;
  if (!isVodHubId(tournament)) {
    notFound();
  }
  const card = vodHubCard(tournament);
  if (!card) {
    notFound();
  }

  after(() => {
    void syncOfficialScheduleIfStale();
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

  const yearFilter = hubYearFilter(card.id);
  const filter = parseVodFilter(await searchParams, yearFilter?.years ?? [], card.id);

  const rows: VodMatchRow[] = matches.map((match) => ({
    id: match.id,
    tournament: match.tournament,
    split: match.split,
    bestOf: match.bestOf,
    startsAtLabel: formatKst(match.startsAt),
    startsAtIso: match.startsAt.toISOString(),
    seasonYear: kstYear(match.startsAt),
    blueAbbr: match.blueTeam.abbr,
    blueName: match.blueTeam.name,
    blueImageUrl: match.blueTeam.imageUrl,
    redAbbr: match.redTeam.abbr,
    redName: match.redTeam.name,
    redImageUrl: match.redTeam.imageUrl,
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
          ? "시즌과 스플릿을 고르면 그 구간 중계·리액션 다시보기가 나옵니다. 팀 이름·약자로 검색할 수 있습니다."
          : "연도와 구간을 고르면 그해 중계·리액션 다시보기가 나옵니다. 팀 이름·약자로 검색할 수 있습니다."}
      </p>
      <VodMatchList
        matches={rows}
        hubId={card.id}
        searchExample={vodHubSearchExample(card.id)}
        yearFilter={yearFilter}
        initialYear={filter.year}
        initialStage={filter.stage}
        initialQuery={filter.q}
      />
    </main>
  );
}
