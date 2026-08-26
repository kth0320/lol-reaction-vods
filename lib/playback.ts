export const PLATFORMS = ["youtube", "soop", "chzzk", "twitch"] as const;

export type Platform = (typeof PLATFORMS)[number];
export type EmbedPlatform = "youtube" | "soop";
export type LinkOutPlatform = "chzzk" | "twitch";

export type Playback =
  | { mode: "embed"; platform: EmbedPlatform; embedUrl: string; originalUrl: string; label: string }
  | { mode: "link-out"; platform: LinkOutPlatform; originalUrl: string; label: string };

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export function getPlayback(platform: Platform, externalId: string, url: string): Playback {
  if (platform === "youtube") {
    return {
      mode: "embed",
      platform,
      embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(externalId)}`,
      originalUrl: url,
      label: "YouTube",
    };
  }

  if (platform === "soop") {
    return {
      mode: "embed",
      platform,
      embedUrl: `https://vod.sooplive.com/player/${encodeURIComponent(externalId)}/embed`,
      originalUrl: url,
      label: "숲",
    };
  }

  if (platform === "twitch") {
    return {
      mode: "link-out",
      platform,
      originalUrl: url,
      label: "Twitch",
    };
  }

  return {
    mode: "link-out",
    platform: "chzzk",
    originalUrl: url,
    label: "치지직",
  };
}

export function platformLabel(platform: Platform): string {
  if (platform === "youtube") return "YouTube";
  if (platform === "soop") return "숲";
  if (platform === "twitch") return "Twitch";
  return "치지직";
}

export function creatorKindLabel(kind: string): string {
  switch (kind) {
    case "streamer":
      return "스트리머";
    case "bj":
      return "BJ";
    case "youtuber":
      return "유튜버";
    case "vtuber":
      return "버튜버";
    default:
      return kind;
  }
}
