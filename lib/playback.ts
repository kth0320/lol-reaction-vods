export const PLATFORMS = ["youtube", "soop", "chzzk"] as const;

export type Platform = (typeof PLATFORMS)[number];

export type Playback =
  | { mode: "embed"; platform: Exclude<Platform, "chzzk">; embedUrl: string; originalUrl: string; label: string }
  | { mode: "link-out"; platform: "chzzk"; originalUrl: string; label: string };

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
