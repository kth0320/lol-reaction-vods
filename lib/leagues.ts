export const LEAGUES = ["LCK", "LPL", "LEC"] as const;

export type League = (typeof LEAGUES)[number];

export const LIVE_CAROUSEL_INTERVAL_MS = 5000;

export function isLeague(value: string): value is League {
  return (LEAGUES as readonly string[]).includes(value);
}

export function sortLiveMatchesByLeague<T extends { tournament: string }>(matches: T[]): T[] {
  return LEAGUES.flatMap((league) => matches.filter((match) => match.tournament === league));
}
