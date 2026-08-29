import { kstYear } from "@/lib/format";
import { hubUsesEventYears, hubUsesLeagueSeasons, type VodHubId } from "@/lib/vod-hub";

/** Current year plus two previous years. Past years stay empty until archives are ingested. */
export const VOD_YEAR_LOOKBACK = 2;

export type VodYearKind = "season" | "year";

export type VodYearFilter = {
  heading: string;
  years: number[];
  kind: VodYearKind;
};

export function vodArchiveYears(now = new Date()): number[] {
  const current = kstYear(now);
  return Array.from({ length: VOD_YEAR_LOOKBACK + 1 }, (_, index) => current - index);
}

export function vodYearOptionLabel(year: number, kind: VodYearKind): string {
  return kind === "season" ? `${year} 시즌` : `${year}년`;
}

export function hubYearFilter(id: VodHubId, now = new Date()): VodYearFilter | undefined {
  if (hubUsesLeagueSeasons(id)) {
    return { heading: "시즌", years: vodArchiveYears(now), kind: "season" };
  }
  if (hubUsesEventYears(id)) {
    return { heading: "연도", years: vodArchiveYears(now), kind: "year" };
  }
  return undefined;
}

export function filterMatchesBySeason<T extends { seasonYear: number }>(rows: T[], year: number): T[] {
  return rows.filter((row) => row.seasonYear === year);
}

export function pastYearEmptyMessage(year: number, kind: VodYearKind): string {
  const label = vodYearOptionLabel(year, kind);
  if (kind === "year") {
    return `${label} 다시보기는 아직 없습니다. 지난 해 영상을 넣으면 여기에 쌓입니다.`;
  }
  return `${label} 다시보기는 아직 없습니다. 지난 시즌 영상을 넣으면 여기에 쌓입니다.`;
}
