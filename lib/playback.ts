export const PLATFORMS = ["youtube", "soop", "chzzk", "twitch"] as const;

export type Platform = (typeof PLATFORMS)[number];
export type EmbedPlatform = Platform;

export type Playback =
  | {
      mode: "embed";
      platform: EmbedPlatform;
      embedUrl: string;
      originalUrl: string;
      label: string;
      needsParent?: boolean;
    }
  | { mode: "link-out"; platform: Platform; originalUrl: string; label: string };

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export function twitchPlayerParents(parentHost: string): string {
  return [...new Set([parentHost, "localhost", "127.0.0.1"])]
    .filter(Boolean)
    .map((host) => `parent=${encodeURIComponent(host)}`)
    .join("&");
}

export function twitchEmbedSrc(
  id: string,
  parentHost: string,
  options: { live?: boolean; autoplay?: boolean; muted?: boolean } = {},
): string {
  const parents = twitchPlayerParents(parentHost);
  const autoplay = options.autoplay === false ? "false" : "true";
  const muted = options.muted ? "&muted=true" : "";
  const useChannel = Boolean(options.live) || !/^\d+$/.test(id);
  const key = useChannel ? "channel" : "video";
  return `https://player.twitch.tv/?${key}=${encodeURIComponent(id)}&${parents}&autoplay=${autoplay}${muted}`;
}

export function getPlayback(
  platform: Platform,
  externalId: string,
  url: string,
  options: { live?: boolean; parentHost?: string } = {},
): Playback {
  if (platform === "youtube") {
    return {
      mode: "embed",
      platform,
      embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(externalId)}`,
      originalUrl: url,
      label: "YouTube",
    };
  }

  if (platform === "soop" && !options.live && /^\d+$/.test(externalId)) {
    return {
      mode: "embed",
      platform,
      embedUrl: `https://vod.sooplive.com/player/${encodeURIComponent(externalId)}/embed`,
      originalUrl: url,
      label: "숲",
    };
  }

  if (platform === "soop") {
    return {
      mode: "link-out",
      platform,
      originalUrl: url,
      label: "숲",
    };
  }

  if (platform === "twitch") {
    return {
      mode: "embed",
      platform,
      embedUrl: twitchEmbedSrc(externalId, options.parentHost || "localhost", {
        live: options.live,
        autoplay: false,
      }),
      originalUrl: url,
      label: "Twitch",
      needsParent: true,
    };
  }

  const path = options.live ? "embed/live" : "embed/video";
  return {
    mode: "embed",
    platform: "chzzk",
    embedUrl: `https://chzzk.naver.com/${path}/${encodeURIComponent(externalId)}`,
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
