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
  platform: string;
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

/** 방송국 다시보기 영상 먼저. 유튜브 편집본이 붙으면 그 영상 링크를 추가. 채널 홈은 쓰지 않음. */
export function pickWatchReactions<T extends { platform: string; publishedAt: Date | null }>(rows: T[]): T[] {
  if (rows.length === 0) {
    throw new Error("pickWatchReactions: empty");
  }
  const picked: T[] = [];
  for (const platform of STATION_ORDER) {
    const hit = rows.find((row) => row.platform === platform);
    if (hit) picked.push(hit);
  }
  const youtube = rows
    .filter((row) => row.platform === "youtube")
    .sort((left, right) => publishedMs(right) - publishedMs(left));
  if (youtube[0]) picked.push(youtube[0]);
  return picked.length > 0 ? picked : [rows[0]];
}

function earliestMs(rows: ReactionForWatch[]): number {
  return Math.min(...rows.map((row) => row.publishedAt?.getTime() ?? Number.POSITIVE_INFINITY));
}

function cardFor(group: ReactionForWatch[]): CreatorWatchCard {
  const rows = pickWatchReactions(group);
  const first = rows[0];
  const titles = [...new Set(rows.map((row) => row.title))];
  const platforms = [...new Set(rows.map((row) => platformName(row.platform)))];
  return {
    key: first.creatorId,
    creatorId: first.creatorId,
    creatorName: first.creatorName,
    creatorKind: first.creatorKind,
    title: titles.join(" · "),
    badge: platforms.join(" · "),
    links: rows.map((row) => {
      const label = platformName(row.platform);
      return { href: row.url, platform: row.platform, label: `${label}에서 보기` };
    }),
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
    .map((group) => cardFor(group));
}
