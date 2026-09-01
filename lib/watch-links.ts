import { isPlatform, platformLabel, type Platform } from "@/lib/playback";

export type ReactionForWatch = {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorKind: string;
  platform: string;
  title: string;
  url: string;
  publishedAt: Date | null;
};

export type WatchLink = {
  href: string;
  label: string;
};

export type CreatorWatchCard = {
  key: string;
  creatorId: string;
  creatorName: string;
  creatorKind: string;
  title: string;
  badge: string;
  links: WatchLink[];
};

const STATION_ORDER: Platform[] = ["chzzk", "soop", "twitch"];

function platformName(platform: string): string {
  return isPlatform(platform) ? platformLabel(platform) : platform;
}

function publishedMs(row: { publishedAt: Date | null }): number {
  return row.publishedAt?.getTime() ?? 0;
}

/** YouTube recap replaces the station VOD once it is attached. Until then, the 치지직/숲 video. */
export function pickPreferredWatchReaction<T extends { platform: string; publishedAt: Date | null }>(
  rows: T[],
): T {
  if (rows.length === 0) {
    throw new Error("pickPreferredWatchReaction: empty");
  }
  const youtube = rows
    .filter((row) => row.platform === "youtube")
    .sort((left, right) => publishedMs(right) - publishedMs(left));
  if (youtube[0]) return youtube[0];
  for (const platform of STATION_ORDER) {
    const hit = rows.find((row) => row.platform === platform);
    if (hit) return hit;
  }
  return rows[0];
}

function earliestMs(rows: ReactionForWatch[]): number {
  return Math.min(...rows.map((row) => row.publishedAt?.getTime() ?? Number.POSITIVE_INFINITY));
}

function cardFor(row: ReactionForWatch): CreatorWatchCard {
  const label = platformName(row.platform);
  return {
    key: row.id,
    creatorId: row.creatorId,
    creatorName: row.creatorName,
    creatorKind: row.creatorKind,
    title: row.title,
    badge: label,
    links: [{ href: row.url, label: `${label}에서 보기` }],
  };
}

export function groupReactionsForWatch(rows: ReactionForWatch[]): CreatorWatchCard[] {
  const byCreator = new Map<string, ReactionForWatch[]>();
  for (const row of rows) {
    const list = byCreator.get(row.creatorId);
    if (list) list.push(row);
    else byCreator.set(row.creatorId, [row]);
  }

  return [...byCreator.values()]
    .sort((left, right) => earliestMs(left) - earliestMs(right))
    .map((group) => cardFor(pickPreferredWatchReaction(group)));
}
