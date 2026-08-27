import { fetchPrototypeSchedules } from "@/lib/ingest/lolesports";
import {
  SCHEDULE_MATCH_SOURCE,
  mapScheduleEvents,
  prototypeLeagueSlugs,
  type OfficialScheduleMatch,
  type ScheduleTeam,
} from "@/lib/ingest/schedule-map";
import { ensureTeamCatalog } from "@/lib/ingest/team-catalog";
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

export async function syncOfficialSchedule(options: { now?: Date; fetchImpl?: typeof fetch } = {}): Promise<OfficialScheduleMatch[]> {
  const inferTeams = await ensureTeamCatalog();
  const stored = await prisma.team.findMany({ select: { id: true, abbr: true, name: true } });
  const teams = catalogToScheduleTeams(inferTeams, stored);
  const events = await fetchPrototypeSchedules(prototypeLeagueSlugs(), options.fetchImpl ?? fetch);
  const mapped = mapScheduleEvents(events, teams, options.now ?? new Date());

  const persist = mapped.filter((match) => match.status === "live" || match.status === "upcoming");

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
