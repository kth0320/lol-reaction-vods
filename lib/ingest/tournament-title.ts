/** Title tokens used to attach VODs to official hub matches. International first so "Worlds LCK T1" stays Worlds. */
export const VOD_TITLE_TOURNAMENTS = ["Worlds", "MSI", "EWC", "First Stand", "LCK", "LPL", "LEC"] as const;

export const TOURNAMENT_TITLE_PATTERNS: Record<string, RegExp> = {
  LCK: /\blck\b|#lck/i,
  LPL: /\blpl\b|#lpl/i,
  LEC: /\blec\b|#lec|#watchlec/i,
  Worlds: /\bworlds\b|#worlds|롤드컵|월즈|월드즈|월드\s*챔피언십/i,
  MSI: /\bmsi\b|#msi/i,
  EWC: /\bewc\b|#ewc|esports world cup/i,
  "First Stand": /\bfirst\s*stand\b|#firststand|#fst|퍼스트\s*스탠드/i,
};

export function titleMentionsTournament(title: string, tournament: string): boolean {
  const pattern = TOURNAMENT_TITLE_PATTERNS[tournament];
  return pattern ? pattern.test(title) : false;
}

export function mentionedVodTournaments(title: string): string[] {
  return VOD_TITLE_TOURNAMENTS.filter((tournament) => titleMentionsTournament(title, tournament));
}
