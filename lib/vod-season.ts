import { kstYear } from "@/lib/format";

/** Current season plus two previous years. Past years stay empty until archives are ingested. */
export const LEAGUE_SEASON_LOOKBACK = 2;

export function leagueVodSeasons(now = new Date()): number[] {
  const current = kstYear(now);
  return Array.from({ length: LEAGUE_SEASON_LOOKBACK + 1 }, (_, index) => current - index);
}

export function seasonLabel(year: number): string {
  return `${year} 시즌`;
}

export function filterMatchesBySeason<T extends { seasonYear: number }>(rows: T[], year: number): T[] {
  return rows.filter((row) => row.seasonYear === year);
}
