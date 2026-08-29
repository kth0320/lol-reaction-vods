/** Public key used by lolesports.com itself — not a secret. Override with LOLESPORTS_API_KEY. */
export const LOLESPORTS_PUBLIC_API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";
export const LOLESPORTS_BASE = "https://esports-api.lolesports.com/persisted/gw";
export const LOLESPORTS_HL = "en-US";

const USER_AGENT = "Mozilla/5.0 (compatible; lol-reaction-vods-prototype/0.1)";
const FETCH_TIMEOUT_MS = 8000;

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export type LolesportsLeague = {
  id: string;
  slug: string;
  name: string;
};

export type LolesportsScheduleTeam = {
  code: string;
  name: string;
  imageUrl: string;
};

export function httpsAssetUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice("http://".length)}`;
  return trimmed;
}

export type LolesportsScheduleEvent = {
  startTime: string;
  state: string;
  type: string;
  blockName: string;
  leagueSlug: string;
  matchId: string;
  bestOf: number;
  teams: LolesportsScheduleTeam[];
};

async function readJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`lolesports HTTP ${response.status}: ${body.slice(0, 180)}`);
  }
  return JSON.parse(body) as unknown;
}

async function fetchGw(path: string, fetchImpl: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const apiKey = process.env.LOLESPORTS_API_KEY || LOLESPORTS_PUBLIC_API_KEY;
  try {
    const response = await fetchImpl(`${LOLESPORTS_BASE}${path}`, {
      headers: {
        "User-Agent": USER_AGENT,
        "x-api-key": apiKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    return readJson(response);
  } finally {
    clearTimeout(timer);
  }
}

export function parseLeagues(payload: unknown): LolesportsLeague[] {
  const leagues = asRecord(asRecord(payload)?.data)?.leagues;
  if (!Array.isArray(leagues)) return [];
  const rows: LolesportsLeague[] = [];
  for (const item of leagues) {
    const row = asRecord(item);
    const id = text(row?.id);
    const slug = text(row?.slug).toLowerCase();
    if (!id || !slug) continue;
    rows.push({ id, slug, name: text(row?.name) || slug });
  }
  return rows;
}

export function leagueIdsForSlugs(leagues: LolesportsLeague[], slugs: readonly string[]): Map<string, string> {
  const wanted = new Set(slugs.map((slug) => slug.toLowerCase()));
  const ids = new Map<string, string>();
  for (const league of leagues) {
    if (wanted.has(league.slug)) ids.set(league.slug, league.id);
  }
  return ids;
}

function parseTeams(value: unknown): LolesportsScheduleTeam[] {
  if (!Array.isArray(value)) return [];
  const teams: LolesportsScheduleTeam[] = [];
  for (const item of value) {
    const row = asRecord(item);
    teams.push({
      code: text(row?.code),
      name: text(row?.name),
      imageUrl: httpsAssetUrl(text(row?.image)),
    });
  }
  return teams;
}

export type LolesportsTournament = {
  id: string;
  slug: string;
  startDate: string;
  endDate: string;
};

export function parseScheduleEvents(payload: unknown, leagueSlugFallback = ""): LolesportsScheduleEvent[] {
  const events = asRecord(asRecord(asRecord(payload)?.data)?.schedule)?.events;
  if (!Array.isArray(events)) return [];
  const rows: LolesportsScheduleEvent[] = [];
  const fallback = leagueSlugFallback.trim().toLowerCase();
  for (const item of events) {
    const event = asRecord(item);
    if (text(event?.type) && text(event?.type) !== "match") continue;
    const match = asRecord(event?.match);
    const matchId = text(match?.id);
    if (!matchId) continue;
    const league = asRecord(event?.league);
    const strategy = asRecord(match?.strategy);
    const bestOf = typeof strategy?.count === "number" && strategy.count > 0 ? Math.floor(strategy.count) : 1;
    rows.push({
      startTime: text(event?.startTime),
      state: text(event?.state),
      type: text(event?.type) || "match",
      blockName: text(event?.blockName) || "정규",
      leagueSlug: text(league?.slug).toLowerCase() || fallback,
      matchId,
      bestOf,
      teams: parseTeams(match?.teams),
    });
  }
  return rows;
}

export function parseTournaments(payload: unknown): LolesportsTournament[] {
  const leagues = asRecord(asRecord(payload)?.data)?.leagues;
  if (!Array.isArray(leagues)) return [];
  const rows: LolesportsTournament[] = [];
  for (const item of leagues) {
    const tournaments = asRecord(item)?.tournaments;
    if (!Array.isArray(tournaments)) continue;
    for (const tournament of tournaments) {
      const row = asRecord(tournament);
      const id = text(row?.id);
      if (!id) continue;
      rows.push({
        id,
        slug: text(row?.slug),
        startDate: text(row?.startDate),
        endDate: text(row?.endDate),
      });
    }
  }
  return rows;
}

export function tournamentOverlapsYears(tournament: LolesportsTournament, years: number[]): boolean {
  if (years.length === 0) return false;
  const start = Number(tournament.startDate.slice(0, 4));
  if (!Number.isFinite(start)) return false;
  const parsedEnd = Number(tournament.endDate.slice(0, 4));
  const end = Number.isFinite(parsedEnd) ? parsedEnd : start;
  return years.some((year) => start <= year && end >= year);
}

export async function fetchLeagues(fetchImpl: typeof fetch = fetch): Promise<LolesportsLeague[]> {
  return parseLeagues(await fetchGw(`/getLeagues?hl=${LOLESPORTS_HL}`, fetchImpl));
}

export async function fetchSchedule(leagueId: string, fetchImpl: typeof fetch = fetch): Promise<LolesportsScheduleEvent[]> {
  const id = encodeURIComponent(leagueId);
  return parseScheduleEvents(await fetchGw(`/getSchedule?hl=${LOLESPORTS_HL}&leagueId=${id}`, fetchImpl));
}

export async function fetchPrototypeSchedules(
  slugs: readonly string[],
  fetchImpl: typeof fetch = fetch,
): Promise<LolesportsScheduleEvent[]> {
  const ids = leagueIdsForSlugs(await fetchLeagues(fetchImpl), slugs);
  const pages = await Promise.all(
    [...ids.entries()].map(async ([, leagueId]) => {
      try {
        return await fetchSchedule(leagueId, fetchImpl);
      } catch {
        return [] as LolesportsScheduleEvent[];
      }
    }),
  );
  return pages.flat();
}

export async function fetchTournamentsForLeague(
  leagueId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LolesportsTournament[]> {
  const id = encodeURIComponent(leagueId);
  return parseTournaments(await fetchGw(`/getTournamentsForLeague?hl=${LOLESPORTS_HL}&leagueId=${id}`, fetchImpl));
}

export async function fetchCompletedEvents(
  tournamentId: string,
  leagueSlug: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LolesportsScheduleEvent[]> {
  const id = encodeURIComponent(tournamentId);
  return parseScheduleEvents(
    await fetchGw(`/getCompletedEvents?hl=${LOLESPORTS_HL}&tournamentId=${id}`, fetchImpl),
    leagueSlug,
  );
}

/** Ended matches for hub archive years. Home live sync still uses the first getSchedule page only. */
export async function fetchArchiveSchedules(
  slugs: readonly string[],
  years: number[],
  fetchImpl: typeof fetch = fetch,
): Promise<LolesportsScheduleEvent[]> {
  if (years.length === 0) return [];
  const ids = leagueIdsForSlugs(await fetchLeagues(fetchImpl), slugs);
  const pages = await Promise.all(
    [...ids.entries()].map(async ([slug, leagueId]) => {
      let tournaments: LolesportsTournament[] = [];
      try {
        tournaments = await fetchTournamentsForLeague(leagueId, fetchImpl);
      } catch {
        return [] as LolesportsScheduleEvent[];
      }
      const wanted = tournaments.filter((tournament) => tournamentOverlapsYears(tournament, years));
      const events = await Promise.all(
        wanted.map(async (tournament) => {
          try {
            return await fetchCompletedEvents(tournament.id, slug, fetchImpl);
          } catch {
            return [] as LolesportsScheduleEvent[];
          }
        }),
      );
      return events.flat();
    }),
  );
  return pages.flat();
}

export async function fetchEventDetails(eventId: string, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const id = encodeURIComponent(eventId);
  return fetchGw(`/getEventDetails?hl=${LOLESPORTS_HL}&id=${id}`, fetchImpl);
}
