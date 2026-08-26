import { LEAGUES, isLeague, isPrototypeLiveLeague, type League } from "@/lib/leagues";

export type InferTeam = {
  id: string;
  league: string;
  aliases: string[];
};

export type InferredLiveMatch = {
  league: League;
  blueTeamId: string;
  redTeamId: string;
  key: string;
};

const LEAGUE_PATTERNS: Record<League, RegExp> = {
  LCK: /\blck\b|#lck/i,
  LPL: /\blpl\b|#lpl/i,
  LEC: /\blec\b|#lec|#watchlec/i,
};

export function ingestMatchId(league: string, teamA: string, teamB: string): string {
  const [left, right] = [teamA, teamB].sort();
  return `ingest-${league.toLowerCase()}-${left}-${right}`;
}

export function titleMentionsLeague(title: string, league: string): boolean {
  if (!isLeague(league)) return false;
  return LEAGUE_PATTERNS[league].test(title);
}

export function mentionedLeagues(title: string): League[] {
  return LEAGUES.filter((league) => isPrototypeLiveLeague(league) && titleMentionsLeague(title, league));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function aliasIndexInTitle(title: string, alias: string): number {
  const needle = alias.trim();
  if (needle.length < 2) return -1;
  if (/^[A-Za-z0-9]+$/.test(needle) && needle.length <= 4) {
    const match = title.match(new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(needle)})`, "i"));
    if (!match || match.index === undefined) return -1;
    return match.index + match[1].length;
  }
  return title.toLowerCase().indexOf(needle.toLowerCase());
}

function teamHits(title: string, teams: InferTeam[]): { id: string; league: string; index: number }[] {
  const hits: { id: string; league: string; index: number }[] = [];
  for (const team of teams) {
    let index = -1;
    for (const alias of team.aliases) {
      const found = aliasIndexInTitle(title, alias);
      if (found >= 0 && (index < 0 || found < index)) index = found;
    }
    if (index >= 0) hits.push({ id: team.id, league: team.league, index });
  }
  hits.sort((a, b) => a.index - b.index);
  return hits;
}

export function inferLiveMatchFromTitle(title: string, teams: InferTeam[]): InferredLiveMatch | null {
  const leagues = mentionedLeagues(title);
  if (leagues.length === 0) return null;
  const hits = teamHits(title, teams);
  if (hits.length < 2) return null;

  const league = leagues[0];
  const inLeague = hits.filter((hit) => !hit.league || hit.league === league);
  const pair = (inLeague.length >= 2 ? inLeague : hits).slice(0, 2);
  if (pair.length < 2 || pair[0].id === pair[1].id) return null;
  if (pair[0].league && pair[1].league && pair[0].league !== pair[1].league) return null;

  return {
    league,
    blueTeamId: pair[0].id,
    redTeamId: pair[1].id,
    key: ingestMatchId(league, pair[0].id, pair[1].id),
  };
}
