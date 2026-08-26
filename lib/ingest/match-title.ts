import { isPrototypeLiveLeague } from "@/lib/leagues";

export type TitleMatchInput = {
  id: string;
  tournament: string;
  blueAliases: string[];
  redAliases: string[];
};

const LEAGUE_PATTERNS: Record<string, RegExp> = {
  LCK: /\blck\b|#lck/i,
  LPL: /\blpl\b|#lpl/i,
  LEC: /\blec\b|#lec|#watchlec/i,
};

export function titleMentionsLeague(title: string, league: string): boolean {
  const pattern = LEAGUE_PATTERNS[league];
  return pattern ? pattern.test(title) : false;
}

export function aliasInTitle(title: string, alias: string): boolean {
  const needle = alias.trim();
  if (needle.length < 2) return false;
  return title.toLowerCase().includes(needle.toLowerCase());
}

export function scoreTitleForMatch(title: string, match: TitleMatchInput): number {
  if (!isPrototypeLiveLeague(match.tournament)) return 0;
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
