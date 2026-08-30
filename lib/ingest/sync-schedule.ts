import { fetchArchiveSchedules, fetchEventDetails, fetchPrototypeSchedules } from "@/lib/ingest/lolesports";
import { eventSeriesIsLive } from "@/lib/ingest/official-stream";
import {
  SCHEDULE_MATCH_SOURCE,
  mapScheduleEvents,
  shouldRecheckCompletedSeries,
  vodHubScheduleSlugs,
  type OfficialScheduleMatch,
  type ScheduleTeam,
} from "@/lib/ingest/schedule-map";
import { ensureScheduleTeams, ensureTeamCatalog } from "@/lib/ingest/team-catalog";
import { prisma } from "@/lib/prisma";

export const SCHEDULE_FRESH_MS = 120_000;

const scheduleState = globalThis as unknown as {
  scheduleSyncAt?: number;
  scheduleSyncInflight?: Promise<OfficialScheduleMatch[]>;
};

function catalogToScheduleTeams(
  rows: { id: string; league: string; aliases: string[] }[],
  stored: { id: string; abbr: string; name: string }[],
): ScheduleTeam[] {
  const byId = new Map(stored.map((team) => [team.id, team]));
  return rows.map((row) => {
    const team = byId.get(row.id);
    return {
      id: row.id,
      abbr: team?.abbr ?? row.id,
      name: team?.name ?? row.id,
      aliases: row.aliases,
    };
  });
}

async function reviveStaleCompletedSeries(
  mapped: OfficialScheduleMatch[],
  fetchImpl: typeof fetch,
  now: Date,
): Promise<void> {
  const stale = mapped.filter((match) => shouldRecheckCompletedSeries(match, now));
  if (stale.length === 0) return;
  await Promise.all(
    stale.map(async (match) => {
      try {
        const details = await fetchEventDetails(match.externalEventId, fetchImpl);
        if (eventSeriesIsLive(details, match.bestOf)) match.status = "live";
      } catch {
        // Keep the schedule mapping if event details fail.
      }
    }),
  );
}

export async function syncOfficialSchedule(
  options: { now?: Date; fetchImpl?: typeof fetch; archiveYears?: number[] } = {},
): Promise<OfficialScheduleMatch[]> {
  const inferTeams = await ensureTeamCatalog();
  const stored = await prisma.team.findMany({ select: { id: true, abbr: true, name: true } });
  const teams = catalogToScheduleTeams(inferTeams, stored);
  const fetchImpl = options.fetchImpl ?? fetch;
  const recent = await fetchPrototypeSchedules(vodHubScheduleSlugs(), fetchImpl);
  const archive =
    options.archiveYears && options.archiveYears.length > 0
      ? await fetchArchiveSchedules(vodHubScheduleSlugs(), options.archiveYears, fetchImpl)
      : [];
  const now = options.now ?? new Date();
  const mapped = mapScheduleEvents([...recent, ...archive], teams, now);
  await reviveStaleCompletedSeries(mapped, fetchImpl, now);

  const persist = mapped.filter(
    (match) => match.status === "live" || match.status === "upcoming" || match.status === "ended",
  );

  await ensureScheduleTeams(
    persist.flatMap((match) => [
      { id: match.blueTeamId, abbr: match.blueAbbr, name: match.blueName, league: match.league },
      { id: match.redTeamId, abbr: match.redAbbr, name: match.redName, league: match.league },
    ]),
  );

  for (const match of persist) {
    await prisma.match.upsert({
      where: { externalEventId: match.externalEventId },
      create: {
        id: match.id,
        tournament: match.league,
        split: match.split,
        bestOf: match.bestOf,
        status: match.status,
        startsAt: match.startsAt,
        blueTeamId: match.blueTeamId,
        redTeamId: match.redTeamId,
        source: SCHEDULE_MATCH_SOURCE,
        externalEventId: match.externalEventId,
      },
      update: {
        tournament: match.league,
        split: match.split,
        bestOf: match.bestOf,
        status: match.status,
        startsAt: match.startsAt,
        blueTeamId: match.blueTeamId,
        redTeamId: match.redTeamId,
        source: SCHEDULE_MATCH_SOURCE,
      },
    });
  }

  const logos = new Map<string, string>();
  for (const match of mapped) {
    if (match.blueImageUrl) logos.set(match.blueTeamId, match.blueImageUrl);
    if (match.redImageUrl) logos.set(match.redTeamId, match.redImageUrl);
  }
  for (const [id, imageUrl] of logos) {
    await prisma.team.update({ where: { id }, data: { imageUrl } });
  }

  const keepIds = persist.map((match) => match.id);
  await prisma.match.updateMany({
    where: {
      source: SCHEDULE_MATCH_SOURCE,
      status: { in: ["live", "upcoming"] },
      ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}),
    },
    data: { status: "ended" },
  });
  await prisma.match.updateMany({
    where: { source: "ingest", status: "live" },
    data: { status: "ended" },
  });

  scheduleState.scheduleSyncAt = Date.now();
  return persist;
}

export async function syncOfficialScheduleIfStale(maxAgeMs = SCHEDULE_FRESH_MS): Promise<OfficialScheduleMatch[]> {
  if (scheduleState.scheduleSyncInflight) {
    return scheduleState.scheduleSyncInflight;
  }
  if (maxAgeMs >= 0 && scheduleState.scheduleSyncAt && Date.now() - scheduleState.scheduleSyncAt < maxAgeMs) {
    return [];
  }
  const work = syncOfficialSchedule()
    .catch((error) => {
      console.error("official schedule sync failed", error);
      return [] as OfficialScheduleMatch[];
    })
    .finally(() => {
      if (scheduleState.scheduleSyncInflight === work) scheduleState.scheduleSyncInflight = undefined;
    });
  scheduleState.scheduleSyncInflight = work;
  return work;
}
