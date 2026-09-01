import {
  PROTOTYPE_LIVE_LEAGUES,
  isPrototypeLiveLeague,
  pickNextMatchByLeague,
  sortLiveMatchesByLeague,
  type PrototypeLiveLeague,
} from "@/lib/leagues";

export type LiveHubKind = "live" | "upcoming" | "empty";

export type LiveHubPick<T> = { match: T; kind: "live" | "upcoming" } | null;

export function pickLiveHubByLeague<T extends { tournament: string; startsAt: Date }>(
  live: T[],
  upcoming: T[],
): Record<PrototypeLiveLeague, LiveHubPick<T>> {
  const liveFirst = new Map<PrototypeLiveLeague, T>();
  for (const match of sortLiveMatchesByLeague(live)) {
    if (!isPrototypeLiveLeague(match.tournament)) continue;
    if (!liveFirst.has(match.tournament)) liveFirst.set(match.tournament, match);
  }
  const next = pickNextMatchByLeague(upcoming);
  return Object.fromEntries(
    PROTOTYPE_LIVE_LEAGUES.map((league) => {
      const liveMatch = liveFirst.get(league);
      if (liveMatch) return [league, { match: liveMatch, kind: "live" as const }];
      const upcomingMatch = next[league];
      if (upcomingMatch) return [league, { match: upcomingMatch, kind: "upcoming" as const }];
      return [league, null];
    }),
  ) as Record<PrototypeLiveLeague, LiveHubPick<T>>;
}

export function liveHubHref(kind: LiveHubKind, matchId: string): string | undefined {
  return kind === "live" ? `/matches/${matchId}` : undefined;
}

export function liveHubBadge(kind: LiveHubKind): string | null {
  if (kind === "live") return "생중계";
  if (kind === "upcoming") return "예정";
  return null;
}

export function liveHubRotateIndices(kinds: LiveHubKind[]): number[] {
  const live = kinds.flatMap((kind, index) => (kind === "live" ? [index] : []));
  if (live.length > 0) return live;
  return kinds.flatMap((kind, index) => (kind === "upcoming" ? [index] : []));
}
