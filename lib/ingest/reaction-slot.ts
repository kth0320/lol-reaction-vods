import { aliasIndexInTitle } from "@/lib/ingest/infer-match";

export type ReactionSlotMatch = {
  startsAt: Date;
  blueAliases: string[];
  redAliases: string[];
};

export type ReactionSlotRow = {
  title: string;
  publishedAt: Date | null;
  externalId: string;
};

const WAITING_ROOM_RE = /대기방|시참|내전/;
const PREGAME_RE = /생각정리|손푼다/;

export function reactionSlotKey(creatorId: string, platform: string, matchId?: string): string {
  return matchId ? `${matchId}\0${creatorId}\0${platform}` : `${creatorId}\0${platform}`;
}

function waitingPenalty(title: string): number {
  if (WAITING_ROOM_RE.test(title)) return 2;
  if (PREGAME_RE.test(title)) return 1;
  return 0;
}

function teamFit(title: string, match: ReactionSlotMatch): number {
  const blue = match.blueAliases.some((alias) => aliasIndexInTitle(title, alias) >= 0);
  const red = match.redAliases.some((alias) => aliasIndexInTitle(title, alias) >= 0);
  return (blue ? 1 : 0) + (red ? 1 : 0);
}

function publishedMs(row: ReactionSlotRow): number {
  return row.publishedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
}

/** Lower is better. */
function compareReactionSlots(a: ReactionSlotRow, b: ReactionSlotRow, match: ReactionSlotMatch): number {
  const wait = waitingPenalty(a.title) - waitingPenalty(b.title);
  if (wait !== 0) return wait;

  const fitA = teamFit(a.title, match);
  const fitB = teamFit(b.title, match);
  if (fitA !== fitB) return fitB - fitA;

  return publishedMs(b) - publishedMs(a);
}

export function pickPreferredReaction<T extends ReactionSlotRow>(rows: T[], match: ReactionSlotMatch): T {
  if (rows.length === 0) {
    throw new Error("pickPreferredReaction: empty");
  }
  return [...rows].sort((left, right) => compareReactionSlots(left, right, match))[0];
}

export function collapseReactionsBySlot<T extends ReactionSlotRow & { creatorId: string; platform: string; matchId?: string }>(
  rows: T[],
  matchFor: (row: T) => ReactionSlotMatch,
): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = reactionSlotKey(row.creatorId, row.platform, row.matchId);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()].map((group) => pickPreferredReaction(group, matchFor(group[0])));
}
