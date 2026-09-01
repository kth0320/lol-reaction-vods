import { isPlatform, platformLabel, type Platform } from "@/lib/playback";

export type ChannelRef = {
  platform: string;
  url: string;
};

export type ReactionForWatch = {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorKind: string;
  platform: string;
  title: string;
  url: string;
  publishedAt: Date | null;
  channels: ChannelRef[];
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

export function pickStationChannel(channels: ChannelRef[]): ChannelRef | null {
  for (const platform of STATION_ORDER) {
    const hit = channels.find((channel) => channel.platform === platform && channel.url);
    if (hit) return hit;
  }
  return null;
}

export function pickYoutubeChannel(channels: ChannelRef[]): ChannelRef | null {
  return channels.find((channel) => channel.platform === "youtube" && channel.url) ?? null;
}

/** Wolf / 갱맘: recap VODs live on YouTube, live home is 치지직·숲·Twitch. */
export function usesChannelPair(youtubeCount: number, channels: ChannelRef[]): boolean {
  const youtube = pickYoutubeChannel(channels);
  if (!youtube) return false;
  if (youtubeCount >= 2) return true;
  return youtubeCount >= 1 && Boolean(pickStationChannel(channels));
}

function earliestMs(rows: ReactionForWatch[]): number {
  return Math.min(...rows.map((row) => row.publishedAt?.getTime() ?? Number.POSITIVE_INFINITY));
}

function platformName(platform: string): string {
  return isPlatform(platform) ? platformLabel(platform) : platform;
}

export function groupReactionsForWatch(rows: ReactionForWatch[]): CreatorWatchCard[] {
  const byCreator = new Map<string, ReactionForWatch[]>();
  for (const row of rows) {
    const list = byCreator.get(row.creatorId);
    if (list) list.push(row);
    else byCreator.set(row.creatorId, [row]);
  }

  const groups = [...byCreator.values()].sort((left, right) => earliestMs(left) - earliestMs(right));
  const cards: CreatorWatchCard[] = [];

  for (const group of groups) {
    group.sort((left, right) => (left.publishedAt?.getTime() ?? 0) - (right.publishedAt?.getTime() ?? 0));
    const first = group[0];
    const youtubeCount = group.filter((row) => row.platform === "youtube").length;

    if (usesChannelPair(youtubeCount, first.channels)) {
      const station = pickStationChannel(first.channels);
      const youtube = pickYoutubeChannel(first.channels);
      const links: WatchLink[] = [];
      if (station) {
        links.push({
          href: station.url,
          label: `${platformName(station.platform)} 방송국`,
        });
      }
      if (youtube) {
        links.push({ href: youtube.url, label: "YouTube 채널" });
      }
      cards.push({
        key: first.creatorId,
        creatorId: first.creatorId,
        creatorName: first.creatorName,
        creatorKind: first.creatorKind,
        title: "유튜브 다시보기가 여러 개라 채널로 이동합니다.",
        badge: "방송국 · YouTube",
        links,
      });
      continue;
    }

    for (const row of group) {
      const label = platformName(row.platform);
      cards.push({
        key: row.id,
        creatorId: row.creatorId,
        creatorName: row.creatorName,
        creatorKind: row.creatorKind,
        title: row.title,
        badge: label,
        links: [{ href: row.url, label: `${label}에서 보기` }],
      });
    }
  }

  return cards;
}
