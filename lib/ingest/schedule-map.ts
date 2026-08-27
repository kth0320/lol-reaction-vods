import { LEAGUE_SLUG, leagueFromSlug, type League } from "@/lib/leagues";
import type { LolesportsScheduleEvent } from "@/lib/ingest/lolesports";

export const SCHEDULE_MATCH_SOURCE = "schedule";
export const PREGAME_MS = 90 * 60 * 1000;
export const DELAYED_SERIES_MS = 12 * 60 * 60 * 1000;

export type ScheduleTeam = {
  id: string;
  abbr: string;
  name: string;
  aliases: string[];
};

export type OfficialScheduleMatch = {
  id: string;
  externalEventId: string;
  league: League;
  split: string;
  bestOf: number;
  apiState: string;
  status: "live" | "upcoming" | "ended";
  startsAt: Date;
  blueTeamId: string;
  redTeamId: string;
};

/** API codes that drifted from our stable team ids / abbreviations. */
export const API_CODE_TO_TEAM_ID: Record<string, string> = {
  DNS: "dnf",
  KRX: "drx",
  MKOI: "koi",
};

export function scheduleMatchId(externalEventId: string): string {
  return `schedule-${externalEventId}`;
}

export function estimatedSeriesMs(bestOf: number): number {
  if (bestOf >= 5) return 6 * 60 * 60 * 1000;
  if (bestOf <= 1) return 90 * 60 * 1000;
  return 3.5 * 60 * 60 * 1000;
}

export function scheduleEventStatus(
  state: string,
  startsAt: Date,
  bestOf: number,
  now = new Date(),
): "live" | "upcoming" | "ended" {
  if (state === "completed") return "ended";
  if (state === "inProgress") return "live";
  if (state !== "unstarted") return "ended";
  const start = startsAt.getTime();
  const nowMs = now.getTime();
  if (nowMs < start - PREGAME_MS) return "upcoming";
  if (nowMs <= start + Math.max(estimatedSeriesMs(bestOf), DELAYED_SERIES_MS)) return "live";
  return "ended";
}

export function usesLiveCandidates(source: string): boolean {
  return source === SCHEDULE_MATCH_SOURCE || source === "ingest";
}

export function sameTeamPair(aBlue: string, aRed: string, bBlue: string, bRed: string): boolean {
  return (aBlue === bBlue && aRed === bRed) || (aBlue === bRed && aRed === bBlue);
}

export function resolveScheduleTeamId(teams: ScheduleTeam[], code: string, name: string): string | null {
  const codeNorm = code.trim();
  const nameNorm = name.trim();
  if (!codeNorm || codeNorm.toUpperCase() === "TBD" || nameNorm.toUpperCase() === "TBD") return null;

  const remapped = API_CODE_TO_TEAM_ID[codeNorm.toUpperCase()];
  if (remapped && teams.some((team) => team.id === remapped)) return remapped;

  const needles = [codeNorm, nameNorm].map((value) => value.toLowerCase()).filter(Boolean);
  for (const team of teams) {
    const haystack = [team.id, team.abbr, team.name, ...team.aliases].map((value) => value.toLowerCase());
    if (needles.some((needle) => haystack.includes(needle))) return team.id;
  }
  return null;
}

export function mapScheduleEvent(
  event: LolesportsScheduleEvent,
  teams: ScheduleTeam[],
  now = new Date(),
): OfficialScheduleMatch | null {
  if (event.teams.length < 2) return null;
  const league = leagueFromSlug(event.leagueSlug);
  if (!league) return null;
  const blueTeamId = resolveScheduleTeamId(teams, event.teams[0].code, event.teams[0].name);
  const redTeamId = resolveScheduleTeamId(teams, event.teams[1].code, event.teams[1].name);
  if (!blueTeamId || !redTeamId || blueTeamId === redTeamId) return null;
  const startsAt = new Date(event.startTime);
  if (Number.isNaN(startsAt.getTime())) return null;
  return {
    id: scheduleMatchId(event.matchId),
    externalEventId: event.matchId,
    league,
    split: event.blockName || "정규",
    bestOf: event.bestOf,
    apiState: event.state,
    status: scheduleEventStatus(event.state, startsAt, event.bestOf, now),
    startsAt,
    blueTeamId,
    redTeamId,
  };
}

export function mapScheduleEvents(
  events: LolesportsScheduleEvent[],
  teams: ScheduleTeam[],
  now = new Date(),
): OfficialScheduleMatch[] {
  const mapped: OfficialScheduleMatch[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    const match = mapScheduleEvent(event, teams, now);
    if (!match || seen.has(match.externalEventId)) continue;
    seen.add(match.externalEventId);
    mapped.push(match);
  }
  return mapped;
}

export function prototypeLeagueSlugs(): string[] {
  return [LEAGUE_SLUG.LCK, LEAGUE_SLUG.LEC];
}

export function attachInferredToOfficial(
  inferred: { league: string; blueTeamId: string; redTeamId: string },
  official: { id: string; tournament: string; blueTeamId: string; redTeamId: string; status: string; startsAt: Date }[],
  now = new Date(),
): string | null {
  const candidates = official.filter(
    (match) =>
      match.tournament === inferred.league &&
      sameTeamPair(match.blueTeamId, match.redTeamId, inferred.blueTeamId, inferred.redTeamId),
  );
  if (candidates.length === 0) return null;
  const live = candidates.filter((match) => match.status === "live");
  const pool = live.length > 0 ? live : candidates;
  pool.sort((a, b) => Math.abs(a.startsAt.getTime() - now.getTime()) - Math.abs(b.startsAt.getTime() - now.getTime()));
  return pool[0]?.id ?? null;
}
