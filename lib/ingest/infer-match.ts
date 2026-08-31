import { mentionedVodTournaments, titleMentionsTournament } from "@/lib/ingest/tournament-title";

export type InferTeam = {
  id: string;
  league: string;
  aliases: string[];
};

export type InferredLiveMatch = {
  league: string;
  blueTeamId: string;
  redTeamId: string;
  key: string;
};

export function ingestMatchId(league: string, teamA: string, teamB: string): string {
  const [left, right] = [teamA, teamB].sort();
  const slug = league.trim().toLowerCase().replace(/\s+/g, "");
  return `ingest-${slug}-${left}-${right}`;
}

export function titleMentionsLeague(title: string, league: string): boolean {
  return titleMentionsTournament(title, league);
}

export function mentionedLeagues(title: string): string[] {
  return mentionedVodTournaments(title);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function aliasIndexInTitle(title: string, alias: string): number {
  const needle = alias.trim();
  if (needle.length < 2) return -1;
  if (/^[A-Za-z0-9]+$/.test(needle) && needle.length <= 4) {
    // Treat glued "vs" as a boundary so SKvsG2 hits G2 (prefix was previously "s").
    const match = title.match(new RegExp(`(^|[^A-Za-z0-9]|vs)(${escapeRegExp(needle)})`, "i"));
    if (!match || match.index === undefined) return -1;
    return match.index + match[1].length;
  }
  return title.toLowerCase().indexOf(needle.toLowerCase());
}

export function teamAppearsInTitle(title: string, aliases: string[]): boolean {
  return aliases.some((alias) => aliasIndexInTitle(title, alias) >= 0);
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

function isInternationalLeague(league: string): boolean {
  return league === "Worlds" || league === "MSI" || league === "EWC" || league === "First Stand";
}

function pairForLeague(
  league: string,
  hits: { id: string; league: string; index: number }[],
): { id: string; league: string }[] | null {
  const inLeague = hits.filter((hit) => !hit.league || hit.league === league);
  const pair = (inLeague.length >= 2 ? inLeague : hits).slice(0, 2);
  if (pair.length < 2 || pair[0].id === pair[1].id) return null;
  if (!isInternationalLeague(league) && pair[0].league && pair[1].league) {
    if (pair[0].league !== pair[1].league) return null;
    if (pair[0].league !== league) return null;
  }
  return pair;
}

export function inferLiveMatchFromTitle(title: string, teams: InferTeam[]): InferredLiveMatch | null {
  const leagues = mentionedLeagues(title);
  if (leagues.length === 0) return null;
  const hits = teamHits(title, teams);
  if (hits.length < 2) return null;

  // Costream titles often include #LCKWatchparty even on LPL/LEC. Prefer the league the two teams belong to.
  for (const league of leagues) {
    const pair = pairForLeague(league, hits);
    if (!pair) continue;
    return {
      league,
      blueTeamId: pair[0].id,
      redTeamId: pair[1].id,
      key: ingestMatchId(league, pair[0].id, pair[1].id),
    };
  }
  return null;
}
