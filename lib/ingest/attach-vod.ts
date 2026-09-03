import { kstYear } from "@/lib/format";
import {
  extraTitlesForVod,
  liveTitleMatchIdsForVod,
  vodTitleIsUnrelatedSession,
  vodTitleNeedsLiveInsurance,
} from "@/lib/ingest/live-title-history";
import { aliasIndexInTitle, inferLiveMatchFromTitle, mentionedLeagues, type InferTeam } from "@/lib/ingest/infer-match";
import { pickPrototypeLiveMatch, type TitleMatchInput } from "@/lib/ingest/match-title";
import { attachInferredToOfficial, sameTeamPair } from "@/lib/ingest/schedule-map";
import { soopPlayerUrl, type SoopChapter, type VodListItem } from "@/lib/ingest/vod-list";
import { matchAcceptsReactionVods, vodInMatchWindow } from "@/lib/ingest/vod-window";

const INTERNATIONAL_TOURNAMENTS = new Set(["Worlds", "MSI", "EWC", "First Stand"]);
const DAY_SLATE_CUE =
  /중계|입중계|스위스|swiss|플레이-?\s*인|플레이인|play-?\s*ins?|녹아웃|knockout|결승|4강|8강|준결승|\bday\s*\d|일차|스테이지|응원/i;
const DAY_SLATE_SKIP = /시차|휴방|팬페스타|road\s*to|로드\s*투|이기면\s*msi|준우승|클래식|cctv|이벤트\s*매치/i;

export type VodAttachMatch = {
  id: string;
  tournament: string;
  status: string;
  startsAt: Date;
  bestOf: number;
  split?: string;
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

export function storedVodIsUnrelatedToMatch(
  title: string,
  match: { blueAliases: string[]; redAliases: string[] } | null,
): boolean {
  if (!vodTitleIsUnrelatedSession(title)) return false;
  if (!match) return true;
  return !vsPairInTitle(title, match.blueAliases, match.redAliases);
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
  const pool = matches.filter(
    (match) => matchAcceptsReactionVods(match.status) && inWindow(match, publishedAt),
  );
  if (pool.length === 0) return [];

  const mentioned = mentionedLeagues(title);
  const vsAny = matches.filter((match) => vsPairInTitle(title, match.blueAliases, match.redAliases));
  const vsHits = pool.filter((match) => vsPairInTitle(title, match.blueAliases, match.redAliases));
  const scoped = mentioned.length === 0 ? vsHits : vsHits.filter((match) => mentioned.includes(match.tournament));
  const hits = scoped.length > 0 ? scoped : vsHits;
  if (vsAny.length > 0) return hits;

  const slate = pickDaySlateMatches(title, publishedAt, pool, matches);
  if (slate.length > 0) return slate;

  const inferred = pickInferredMatch(title, publishedAt, pool);
  return inferred ? [inferred] : [];
}

function teamIdsInTitle(title: string, pool: VodAttachMatch[]): string[] {
  const ids = new Set<string>();
  for (const match of pool) {
    if (match.blueAliases.some((alias) => aliasIndexInTitle(title, alias) >= 0)) ids.add(match.blueTeamId);
    if (match.redAliases.some((alias) => aliasIndexInTitle(title, alias) >= 0)) ids.add(match.redTeamId);
  }
  return [...ids];
}

function splitMatchesStage(title: string, split: string | undefined): boolean {
  if (!split) return true;
  if (/스위스|\bswiss\b/i.test(title)) return /swiss/i.test(split);
  if (/플레이-?\s*인|플레이인|play-?\s*ins?/i.test(title)) return /play/i.test(split);
  if (/8강|quarter/i.test(title)) return /quarter/i.test(split);
  if (/4강|준결승|semi/i.test(title)) return /semi/i.test(split);
  if (/(?<!준)결승|\bfinals?\b/i.test(title)) return /final/i.test(split) && !/semi|quarter/i.test(split);
  if (/녹아웃|knockout/i.test(title)) return /knock|quarter|semi|final/i.test(split);
  return true;
}

export function slateDayIndex(title: string): number | "last" | null {
  if (/마지막날|막날/.test(title)) return "last";
  const numbered = title.match(/(\d+)\s*일차/i) ?? title.match(/\bday\s*(\d+)/i);
  if (!numbered) return null;
  const index = Number(numbered[1]);
  return Number.isFinite(index) && index >= 1 ? index : null;
}

const SLATE_DAY_GAP_MS = 8 * 60 * 60 * 1000;

/** One event day = matches chained with less than 8h between starts (EU Worlds overnight is longer). */
export function groupMatchesByEventDay(matches: VodAttachMatch[]): VodAttachMatch[][] {
  const sorted = [...matches].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const days: VodAttachMatch[][] = [];
  for (const match of sorted) {
    const last = days[days.length - 1];
    const prev = last?.[last.length - 1];
    if (!last || !prev || match.startsAt.getTime() - prev.startsAt.getTime() > SLATE_DAY_GAP_MS) {
      days.push([match]);
    } else {
      last.push(match);
    }
  }
  return days;
}

function matchesOnSlateDay(
  title: string,
  publishedAt: Date,
  candidates: VodAttachMatch[],
): VodAttachMatch[] {
  const days = groupMatchesByEventDay(candidates);
  if (days.length === 0) return [];

  const index = slateDayIndex(title);
  if (index === "last") return days[days.length - 1] ?? [];
  if (typeof index === "number") return days[index - 1] ?? [];

  return days.reduce((best, group) => {
    const start = group[0]?.startsAt.getTime() ?? 0;
    const bestStart = best[0]?.startsAt.getTime() ?? 0;
    return Math.abs(start - publishedAt.getTime()) < Math.abs(bestStart - publishedAt.getTime()) ? group : best;
  });
}

/** Whole-day Worlds/MSI/FST streams often omit vs pairs ("스위스 Day 9", "월즈 입중계 T1 응원방"). */
export function pickDaySlateMatches(
  title: string,
  publishedAt: Date | null,
  _windowed: VodAttachMatch[],
  all: VodAttachMatch[] = _windowed,
): VodAttachMatch[] {
  if (!publishedAt || DAY_SLATE_SKIP.test(title) || !DAY_SLATE_CUE.test(title)) return [];
  const intl = mentionedLeagues(title).filter((tournament) => INTERNATIONAL_TOURNAMENTS.has(tournament));
  if (intl.length === 0) return [];

  const stagePool = all.filter(
    (match) =>
      matchAcceptsReactionVods(match.status) &&
      intl.includes(match.tournament) &&
      splitMatchesStage(title, match.split) &&
      kstYear(match.startsAt) === kstYear(publishedAt),
  );
  const teams = teamIdsInTitle(title, all);
  return matchesOnSlateDay(title, publishedAt, stagePool).filter((match) => {
    if (teams.length === 0) return true;
    return teams.includes(match.blueTeamId) || teams.includes(match.redTeamId);
  });
}

export function pickMatchForVod(
  title: string,
  publishedAt: Date | null,
  matches: VodAttachMatch[],
): VodAttachMatch | null {
  return pickMatchesForVod(title, publishedAt, matches)[0] ?? null;
}

export type LiveTitleRow = { title: string; seenAt: Date; matchId: string | null; platform?: string };

function historyForVod(item: { platform?: string }, history: LiveTitleRow[]): LiveTitleRow[] {
  if (!item.platform) return history;
  return history.filter((row) => !row.platform || row.platform === item.platform);
}

/** Chapter titles only attach when they contain this series as A vs B. */
function matchesFromChapterTitles(
  extraTitles: string[] | undefined,
  publishedAt: Date | null,
  matches: VodAttachMatch[],
): VodAttachMatch[] {
  const ids = new Set<string>();
  for (const title of extraTitles ?? []) {
    for (const match of pickMatchesForVod(title, publishedAt, matches)) {
      if (vsPairInTitle(title, match.blueAliases, match.redAliases)) ids.add(match.id);
    }
  }
  return matches.filter((match) => ids.has(match.id));
}

export function vodOverlapsEndedMatch(publishedAt: Date | null, matches: VodAttachMatch[]): boolean {
  if (!publishedAt) return false;
  return matches.some(
    (match) => matchAcceptsReactionVods(match.status) && vodInMatchWindow(publishedAt, match.startsAt, match.bestOf),
  );
}

/** Fetch SOOP chapters only after the list title missed, on a match-day replay. */
export function shouldFetchSoopChapters(
  item: { platform?: string; publishedAt: Date | null },
  attached: VodAttachMatch[],
  matches: VodAttachMatch[],
): boolean {
  if (item.platform !== "soop") return false;
  if (attached.length > 0) return false;
  return vodOverlapsEndedMatch(item.publishedAt, matches);
}

export function withSoopChapterTitles(item: VodListItem, chapters: SoopChapter[], matches: VodAttachMatch[]): VodListItem {
  const useful = chapters.filter((chapter) =>
    matches.some((match) => vsPairInTitle(chapter.title, match.blueAliases, match.redAliases)),
  );
  if (useful.length === 0) return item;
  return { ...item, extraTitles: useful.map((chapter) => chapter.title), chapters: useful };
}

/** Store the vs-pair chapter title so FC온라인 list titles are not dropped later. */
export function persistFieldsForMatch(
  item: { title: string; url: string; externalId: string; chapters?: SoopChapter[] },
  match: VodAttachMatch,
): { title: string; url: string } {
  const chapter = item.chapters?.find((row) => vsPairInTitle(row.title, match.blueAliases, match.redAliases));
  if (!chapter) return { title: item.title, url: item.url };
  return { title: chapter.title, url: soopPlayerUrl(item.externalId, chapter.timeSec) };
}

function hasSeekTime(url: string): boolean {
  return /[?&]seektime=\d+/i.test(url);
}

/** Do not turn an already-attached full replay into a mid-stream chapter jump. */
export function keepStoredReplayUrl(storedUrl: string, incomingUrl: string): string {
  const stored = storedUrl.trim();
  const incoming = incomingUrl.trim();
  if (!stored) return incoming;
  if (hasSeekTime(incoming) && !hasSeekTime(stored)) return stored;
  return incoming;
}

/** Do not overwrite a match title with a later 솔랭 / FC온라인 list title. */
export function keepStoredReplayTitle(
  storedTitle: string,
  incomingTitle: string,
  match: { blueAliases: string[]; redAliases: string[] },
): string {
  const stored = storedTitle.trim();
  const incoming = incomingTitle.trim();
  if (!stored) return incoming;
  if (storedVodIsUnrelatedToMatch(incoming, match) && !storedVodIsUnrelatedToMatch(stored, match)) {
    return stored;
  }
  return incoming;
}

/** Title match plus live-title insurance, without using the next stream's title. */
export function pickMatchesForVodWithLiveTitles(
  item: { title: string; publishedAt: Date | null; platform?: string; extraTitles?: string[] },
  history: LiveTitleRow[],
  matches: VodAttachMatch[],
): VodAttachMatch[] {
  const ids = new Set(pickMatchesForVod(item.title, item.publishedAt, matches).map((match) => match.id));
  for (const match of matchesFromChapterTitles(item.extraTitles, item.publishedAt, matches)) {
    ids.add(match.id);
  }
  if (ids.size > 0) return matches.filter((match) => ids.has(match.id));
  if (!vodTitleNeedsLiveInsurance(item.title)) return [];

  const rows = historyForVod(item, history);
  for (const title of extraTitlesForVod({
    currentTitle: item.title,
    publishedAt: item.publishedAt,
    rows,
  })) {
    for (const match of pickMatchesForVod(title, item.publishedAt, matches)) ids.add(match.id);
  }
  for (const matchId of liveTitleMatchIdsForVod({
    publishedAt: item.publishedAt,
    rows,
    matches,
  })) {
    ids.add(matchId);
  }
  return matches.filter((match) => ids.has(match.id));
}
