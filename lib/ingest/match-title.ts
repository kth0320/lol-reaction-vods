import { titleMentionsTournament } from "@/lib/ingest/tournament-title";
import { matchTournamentToHub } from "@/lib/vod-hub";
import { teamFieldMatchesQuery } from "@/lib/vod-search";

export type TitleMatchInput = {
  id: string;
  tournament: string;
  blueAliases: string[];
  redAliases: string[];
};

export function titleMentionsLeague(title: string, league: string): boolean {
  return titleMentionsTournament(title, league);
}

export function aliasInTitle(title: string, alias: string): boolean {
  return teamFieldMatchesQuery(title, alias);
}

export function scoreTitleForMatch(title: string, match: TitleMatchInput): number {
  if (!matchTournamentToHub(match.tournament)) return 0;
  if (titleMentionsLeague(title, "LPL") && !titleMentionsLeague(title, match.tournament)) return 0;

  let score = 0;
  if (titleMentionsLeague(title, match.tournament)) score += 5;
  if (match.blueAliases.some((alias) => aliasInTitle(title, alias))) score += 3;
  if (match.redAliases.some((alias) => aliasInTitle(title, alias))) score += 3;
  return score;
}

export function pickPrototypeLiveMatch(title: string, matches: TitleMatchInput[]): TitleMatchInput | null {
  let best: { match: TitleMatchInput; score: number } | null = null;
  for (const match of matches) {
    const score = scoreTitleForMatch(title, match);
    if (score < 8) continue;
    if (!best || score > best.score) best = { match, score };
  }
  return best?.match ?? null;
}
