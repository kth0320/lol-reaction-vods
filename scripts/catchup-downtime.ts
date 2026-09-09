/**
 * Catch up schedule + replays after the server was down (~4 days).
 */
import { pollReactionVods } from "../lib/ingest/poll-vods";
import { syncOfficialSchedule } from "../lib/ingest/sync-schedule";
import { vodArchiveYears } from "../lib/vod-season";
import { prisma } from "../lib/prisma";
import { vodAttachTournaments } from "../lib/vod-hub";

async function main() {
  const beforeMatches = await prisma.match.count({
    where: { tournament: { in: vodAttachTournaments() } },
  });
  const beforeVods = await prisma.reactionVod.count();

  const mapped = await syncOfficialSchedule({ archiveYears: vodArchiveYears() });
  console.log(`schedule synced: ${mapped.length} official rows`);

  // Since ~Sep 7 downtime; widen a bit past 24h product window.
  const catchUpMs = 4 * 24 * 60 * 60 * 1000;
  const summary = await pollReactionVods({
    maxAgeMs: null,
    prune: false,
    catchUpMs,
  });

  const afterMatches = await prisma.match.count({
    where: { tournament: { in: vodAttachTournaments() } },
  });
  const afterVods = await prisma.reactionVod.count();

  const recent = await prisma.match.findMany({
    where: {
      tournament: { in: vodAttachTournaments() },
      startsAt: { gte: new Date(Date.now() - catchUpMs) },
    },
    include: {
      blueTeam: true,
      redTeam: true,
      _count: { select: { reactions: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  console.log(
    JSON.stringify(
      {
        matches: `${beforeMatches} → ${afterMatches}`,
        vods: `${beforeVods} → ${afterVods}`,
        poll: summary,
        recentMatches: recent.map((m) => ({
          vs: `${m.blueTeam.abbr} vs ${m.redTeam.abbr}`,
          tournament: m.tournament,
          status: m.status,
          startsAt: m.startsAt.toISOString(),
          reactions: m._count.reactions,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
