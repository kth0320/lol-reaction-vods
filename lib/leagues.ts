export const LEAGUES = ["LCK", "LPL", "LEC"] as const;
export const PROTOTYPE_LIVE_LEAGUES = ["LCK", "LPL", "LEC"] as const;

export type League = (typeof LEAGUES)[number];
export type PrototypeLiveLeague = (typeof PROTOTYPE_LIVE_LEAGUES)[number];

export const LIVE_CAROUSEL_INTERVAL_MS = 5000;

export function isLeague(value: string): value is League {
  return (LEAGUES as readonly string[]).includes(value);
}

export function isPrototypeLiveLeague(value: string): value is PrototypeLiveLeague {
  return (PROTOTYPE_LIVE_LEAGUES as readonly string[]).includes(value);
}

export const LEAGUE_SLUG: Record<League, string> = {
  LCK: "lck",
  LPL: "lpl",
  LEC: "lec",
};

export function leagueFromSlug(slug: string): League | null {
  const upper = slug.trim().toUpperCase();
  return isLeague(upper) ? upper : null;
}

export function sortLiveMatchesByLeague<T extends { tournament: string }>(matches: T[]): T[] {
  return LEAGUES.flatMap((league) => matches.filter((match) => match.tournament === league));
}

/** Earliest upcoming match per live hub league. Missing leagues stay null. */
export function pickNextMatchByLeague<T extends { tournament: string; startsAt: Date }>(
  matches: T[],
  leagues: readonly PrototypeLiveLeague[] = PROTOTYPE_LIVE_LEAGUES,
): Record<PrototypeLiveLeague, T | null> {
  const next = Object.fromEntries(leagues.map((league) => [league, null])) as Record<
    PrototypeLiveLeague,
    T | null
  >;
  const sorted = [...matches].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  for (const match of sorted) {
    if (!isPrototypeLiveLeague(match.tournament)) continue;
    if (!next[match.tournament]) next[match.tournament] = match;
  }
  return next;
}
