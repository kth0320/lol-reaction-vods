export type TeamFilter = "all" | "neutral" | string;
export type PlatformFilter = "all" | string;

export type LiveCastFilterInput = {
  platform: string;
  supportingTeamId: string | null;
};

export function filterLiveCasts<T extends LiveCastFilterInput>(
  casts: T[],
  team: TeamFilter,
  platform: PlatformFilter,
): T[] {
  return casts.filter((cast) => {
    const teamOk =
      team === "all" ||
      (team === "neutral" && cast.supportingTeamId === null) ||
      cast.supportingTeamId === team;
    const platformOk = platform === "all" || cast.platform === platform;
    return teamOk && platformOk;
  });
}

export function supportLabel(supportingTeamAbbr: string | null): string {
  return supportingTeamAbbr ? `${supportingTeamAbbr} 응원` : "중립";
}
