import { LEAGUE_SLUG, isPrototypeLiveLeague } from "@/lib/leagues";
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
  league: string;
  split: string;
  bestOf: number;
  apiState: string;
  status: "live" | "upcoming" | "ended";
  startsAt: Date;
  blueTeamId: string;
  redTeamId: string;
  blueAbbr: string;
  blueName: string;
  redAbbr: string;
  redName: string;
  blueImageUrl: string;
  redImageUrl: string;
};

/** lolesports slugs for VOD hub schedules. Live vs-cards use prototypeLeagueSlugs() (LCK · LPL · LEC). */
export const VOD_HUB_SCHEDULE_SLUGS = ["lck", "lec", "lpl", "worlds", "msi", "first_stand", "ewc_lol"] as const;

const SLUG_TO_TOURNAMENT: Record<string, string> = {
  lck: "LCK",
  lpl: "LPL",
  lec: "LEC",
  worlds: "Worlds",
  msi: "MSI",
  first_stand: "First Stand",
  ewc_lol: "EWC",
};

export function tournamentFromSlug(slug: string): string | null {
  return SLUG_TO_TOURNAMENT[slug.trim().toLowerCase()] ?? null;
}

export function vodHubScheduleSlugs(): string[] {
  return [...VOD_HUB_SCHEDULE_SLUGS];
}

/** API codes that drifted from our stable team ids / abbreviations. */
export const API_CODE_TO_TEAM_ID: Record<string, string> = {
  DNS: "dnf",
  KRX: "drx",
  MKOI: "koi",
};

/** Short names streamers put in titles (TLAW → TL, paiN → PNG). */
export const API_TEAM_EXTRA_ALIASES: Record<string, string[]> = {
  TLAW: ["TL", "Team Liquid", "리퀴드"],
  PAIN: ["PNG", "paiN"],
};

export function extraAliasesForAbbr(abbr: string): string[] {
  return API_TEAM_EXTRA_ALIASES[abbr.trim().toUpperCase()] ?? [];
}

export function scheduleMatchId(externalEventId: string): string {
  return `schedule-${externalEventId}`;
}

export function estimatedSeriesMs(bestOf: number): number {
  if (bestOf >= 5) return 6 * 60 * 60 * 1000;
  if (bestOf <= 1) return 90 * 60 * 1000;
  return 3.5 * 60 * 60 * 1000;
}

export function seriesWinTarget(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}

export function seriesIsDecided(
  bestOf: number,
  blueWins: number | null | undefined,
  redWins: number | null | undefined,
): boolean {
  if (blueWins == null || redWins == null) return false;
  if (!Number.isFinite(blueWins) || !Number.isFinite(redWins)) return false;
  const need = seriesWinTarget(bestOf);
  return blueWins >= need || redWins >= need;
}

export function inScheduleLiveWindow(startsAt: Date, bestOf: number, now = new Date()): boolean {
  const start = startsAt.getTime();
  const nowMs = now.getTime();
  if (nowMs < start - PREGAME_MS) return false;
  return nowMs <= start + Math.max(estimatedSeriesMs(bestOf), DELAYED_SERIES_MS);
}

export function scheduleEventStatus(
  state: string,
  startsAt: Date,
  bestOf: number,
  now = new Date(),
  blueWins?: number | null,
  redWins?: number | null,
): "live" | "upcoming" | "ended" {
  if (state === "inProgress") return "live";
  if (state === "completed") {
    // getSchedule often marks a BO5 "completed" mid-series. Trust the score, not the flag.
    if (inScheduleLiveWindow(startsAt, bestOf, now) && !seriesIsDecided(bestOf, blueWins, redWins)) {
      return "live";
    }
    return "ended";
  }
  if (state !== "unstarted") return "ended";
  if (now.getTime() < startsAt.getTime() - PREGAME_MS) return "upcoming";
  if (inScheduleLiveWindow(startsAt, bestOf, now)) return "live";
  return "ended";
}

/** Ended live-hub matches still inside the series window — re-check getEventDetails games. */
export function shouldRecheckCompletedSeries(
  match: { league: string; status: string; startsAt: Date; bestOf: number },
  now = new Date(),
): boolean {
  if (!isPrototypeLiveLeague(match.league)) return false;
  if (match.status !== "ended") return false;
  return inScheduleLiveWindow(match.startsAt, match.bestOf, now);
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
  return fallbackApiTeamId(codeNorm);
}

/** Catalog miss: persist Worlds/LPL/MSI teams as api-{code} so hub matches still store. */
export function fallbackApiTeamId(code: string): string | null {
  const remapped = API_CODE_TO_TEAM_ID[code.trim().toUpperCase()];
  if (remapped) return remapped;
  const slug = code.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return slug ? `api-${slug}` : null;
}

export function mapScheduleEvent(
  event: LolesportsScheduleEvent,
  teams: ScheduleTeam[],
  now = new Date(),
): OfficialScheduleMatch | null {
  if (event.teams.length < 2) return null;
  const league = tournamentFromSlug(event.leagueSlug);
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
    status: scheduleEventStatus(
      event.state,
      startsAt,
      event.bestOf,
      now,
      event.teams[0].gameWins,
      event.teams[1].gameWins,
    ),
    startsAt,
    blueTeamId,
    redTeamId,
    blueAbbr: event.teams[0].code.trim() || event.teams[0].name.trim(),
    blueName: event.teams[0].name.trim() || event.teams[0].code.trim(),
    redAbbr: event.teams[1].code.trim() || event.teams[1].name.trim(),
    redName: event.teams[1].name.trim() || event.teams[1].code.trim(),
    blueImageUrl: event.teams[0].imageUrl,
    redImageUrl: event.teams[1].imageUrl,
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
  return [LEAGUE_SLUG.LCK, LEAGUE_SLUG.LPL, LEAGUE_SLUG.LEC];
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
