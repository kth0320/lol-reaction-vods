import { inferLiveMatchFromTitle, mentionedLeagues, type InferTeam } from "@/lib/ingest/infer-match";
import { pickPrototypeLiveMatch, type TitleMatchInput } from "@/lib/ingest/match-title";
import { attachInferredToOfficial, sameTeamPair } from "@/lib/ingest/schedule-map";
import { vodInMatchWindow } from "@/lib/ingest/vod-window";

export type VodAttachMatch = {
  id: string;
  tournament: string;
  status: string;
  startsAt: Date;
  bestOf: number;
  blueTeamId: string;
  redTeamId: string;
  blueAliases: string[];
  redAliases: string[];
};

function inferTeams(matches: VodAttachMatch[]): InferTeam[] {
  const byId = new Map<string, InferTeam>();
  for (const match of matches) {
    if (!byId.has(match.blueTeamId)) {
      byId.set(match.blueTeamId, { id: match.blueTeamId, league: match.tournament, aliases: match.blueAliases });
    }
    if (!byId.has(match.redTeamId)) {
      byId.set(match.redTeamId, { id: match.redTeamId, league: match.tournament, aliases: match.redAliases });
    }
  }
  return [...byId.values()];
}

function titleInputs(matches: VodAttachMatch[]): TitleMatchInput[] {
  return matches.map((match) => ({
    id: match.id,
    tournament: match.tournament,
    blueAliases: match.blueAliases,
    redAliases: match.redAliases,
  }));
}

function inWindow(match: VodAttachMatch, publishedAt: Date | null): boolean {
  if (!publishedAt) return true;
  return vodInMatchWindow(publishedAt, match.startsAt, match.bestOf);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shortCodeLeftBound(alias: string): string {
  return /^[A-Za-z0-9]+$/.test(alias) && alias.length <= 4 ? "(?:^|[^A-Za-z0-9]|vs)" : "";
}

/** True when the title has this series as A vs B (glued SKvsG2 included). */
export function vsPairInTitle(title: string, blueAliases: string[], redAliases: string[]): boolean {
  const sep = String.raw`\s*(?:vs|versus|대)\s*`;
  for (const rawLeft of blueAliases) {
    for (const rawRight of redAliases) {
      const left = rawLeft.trim();
      const right = rawRight.trim();
      if (left.length < 2 || right.length < 2) continue;
      const a = escapeRegExp(left);
      const b = escapeRegExp(right);
      if (new RegExp(`${shortCodeLeftBound(left)}${a}${sep}${b}`, "i").test(title)) return true;
      if (new RegExp(`${shortCodeLeftBound(right)}${b}${sep}${a}`, "i").test(title)) return true;
    }
  }
  return false;
}

function pickInferredMatch(
  title: string,
  publishedAt: Date | null,
  pool: VodAttachMatch[],
): VodAttachMatch | null {
  const inferred = inferLiveMatchFromTitle(title, inferTeams(pool));
  const attachedId = inferred ? attachInferredToOfficial(inferred, pool, publishedAt ?? new Date()) : null;
  if (attachedId) {
    const hit = pool.find((match) => match.id === attachedId);
    if (hit) return hit;
  }

  const picked = pickPrototypeLiveMatch(title, titleInputs(pool));
  const byScore = picked ? pool.find((match) => match.id === picked.id) ?? null : null;
  if (byScore) return byScore;

  if (!publishedAt || !inferred) return null;
  const pair = pool.filter(
    (match) =>
      match.tournament === inferred.league &&
      sameTeamPair(match.blueTeamId, match.redTeamId, inferred.blueTeamId, inferred.redTeamId),
  );
  pair.sort(
    (a, b) =>
      Math.abs(a.startsAt.getTime() - publishedAt.getTime()) - Math.abs(b.startsAt.getTime() - publishedAt.getTime()),
  );
  return pair[0] ?? null;
}

export function pickMatchesForVod(
  title: string,
  publishedAt: Date | null,
  matches: VodAttachMatch[],
): VodAttachMatch[] {
  const pool = matches.filter((match) => inWindow(match, publishedAt));
  if (pool.length === 0) return [];

  const mentioned = mentionedLeagues(title);
  const vsHits = pool.filter((match) => vsPairInTitle(title, match.blueAliases, match.redAliases));
  const scoped = mentioned.length === 0 ? vsHits : vsHits.filter((match) => mentioned.includes(match.tournament));
  const hits = scoped.length > 0 ? scoped : vsHits;
  if (hits.length > 0) return hits;

  const inferred = pickInferredMatch(title, publishedAt, pool);
  return inferred ? [inferred] : [];
}

export function pickMatchForVod(
  title: string,
  publishedAt: Date | null,
  matches: VodAttachMatch[],
): VodAttachMatch | null {
  return pickMatchesForVod(title, publishedAt, matches)[0] ?? null;
}
