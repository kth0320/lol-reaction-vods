import { prisma } from "@/lib/prisma";
import { matchAcceptsReactionVods, vodInMatchWindow } from "@/lib/ingest/vod-window";

/** VOD uploaded after the live (YouTube). Live titles from this far before publish still count. */
export const TITLE_BEFORE_VOD_MS = 18 * 60 * 60 * 1000;
/** Same Chzzk session after VOD create. Next morning's stream is outside this. */
export const TITLE_AFTER_VOD_MS = 12 * 60 * 60 * 1000;

const LIVE_INSURANCE_TITLE =
  /다시보기|풀영상|풀버전|전체다시|전체보기|\breplays?\b|\bvods?\b|하이라이트|모음/i;
const LIVE_INSURANCE_WAITING = /대기방|시참|손푼다|생각정리/;
const UNRELATED_SESSION =
  /솔로랭크|솔랭|피파|fco|fc\s*온라인|메이플|팰월드|퍼클런|내전/i;

export function vodTitleIsUnrelatedSession(title: string): boolean {
  return UNRELATED_SESSION.test(title.trim());
}

/** Live titles fill in a retitled replay, not a later FC Online / TFT / variety VOD. */
export function vodTitleNeedsLiveInsurance(title: string): boolean {
  const trimmed = title.trim();
  if (trimmed.length === 0) return true;
  if (vodTitleIsUnrelatedSession(trimmed)) return false;
  return LIVE_INSURANCE_TITLE.test(trimmed) || LIVE_INSURANCE_WAITING.test(trimmed);
}

export type LiveTitleMatchWindow = {
  id: string;
  startsAt: Date;
  bestOf: number;
  status?: string;
};

export async function recordLiveTitle(options: {
  creatorId: string;
  platform: string;
  title: string;
  matchId: string | null;
  isLive: boolean;
}): Promise<void> {
  const title = options.title.trim();
  if (!options.isLive || title.length < 4) return;
  const last = await prisma.liveTitleHistory.findFirst({
    where: { creatorId: options.creatorId, platform: options.platform },
    orderBy: { seenAt: "desc" },
  });
  if (last && last.title === title) return;
  await prisma.liveTitleHistory.create({
    data: {
      creatorId: options.creatorId,
      platform: options.platform,
      title,
      matchId: options.matchId,
    },
  });
}

/** True when a live title belongs to this VOD's session, not the next stream. */
export function liveTitleNearVod(seenAt: Date, publishedAt: Date | null): boolean {
  if (!publishedAt) return false;
  const delta = seenAt.getTime() - publishedAt.getTime();
  if (!Number.isFinite(delta)) return false;
  if (delta >= 0) return delta <= TITLE_AFTER_VOD_MS;
  return -delta <= TITLE_BEFORE_VOD_MS;
}

export function extraTitlesForVod(options: {
  currentTitle: string;
  publishedAt: Date | null;
  rows: { title: string; seenAt: Date; matchId: string | null }[];
}): string[] {
  const titles = [options.currentTitle.trim()].filter(Boolean);
  if (!options.publishedAt) return titles;
  for (const row of options.rows) {
    const title = row.title.trim();
    if (!title || titles.includes(title)) continue;
    if (!liveTitleNearVod(row.seenAt, options.publishedAt)) continue;
    titles.push(title);
  }
  return titles;
}

export function liveTitleMatchIdsForVod(options: {
  publishedAt: Date | null;
  rows: { seenAt: Date; matchId: string | null }[];
  matches?: LiveTitleMatchWindow[];
}): string[] {
  if (!options.publishedAt) return [];
  const byId = options.matches ? new Map(options.matches.map((match) => [match.id, match])) : null;
  const ids: string[] = [];
  for (const row of options.rows) {
    if (!row.matchId || ids.includes(row.matchId)) continue;
    if (!liveTitleNearVod(row.seenAt, options.publishedAt)) continue;
    if (byId) {
      const match = byId.get(row.matchId);
      if (!match) continue;
      if (!matchAcceptsReactionVods(match.status ?? "ended")) continue;
      if (!vodInMatchWindow(options.publishedAt, match.startsAt, match.bestOf)) continue;
    }
    ids.push(row.matchId);
  }
  return ids;
}
