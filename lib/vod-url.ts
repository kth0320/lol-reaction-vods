import type { Platform } from "@/lib/playback";

export type ParsedVodUrl = {
  platform: Exclude<Platform, "twitch">;
  externalId: string;
  canonicalUrl: string;
};

function youtubeId(value: string): string | null {
  const id = value.trim();
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export function parseVodUrl(raw: string): ParsedVodUrl | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = youtubeId(url.pathname.split("/").filter(Boolean)[0] ?? "");
    return id ? { platform: "youtube", externalId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` } : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const fromQuery = youtubeId(url.searchParams.get("v") ?? "");
    if (fromQuery) {
      return { platform: "youtube", externalId: fromQuery, canonicalUrl: `https://www.youtube.com/watch?v=${fromQuery}` };
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
      const id = youtubeId(parts[1] ?? "");
      return id ? { platform: "youtube", externalId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` } : null;
    }
    return null;
  }

  if (host === "chzzk.naver.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "video" && /^\d+$/.test(parts[1] ?? "")) {
      return {
        platform: "chzzk",
        externalId: parts[1],
        canonicalUrl: `https://chzzk.naver.com/video/${parts[1]}`,
      };
    }
    return null;
  }

  if (host === "vod.sooplive.com" || host === "vod.afreecatv.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "player" && /^\d+$/.test(parts[1] ?? "")) {
      return {
        platform: "soop",
        externalId: parts[1],
        canonicalUrl: `https://vod.sooplive.com/player/${parts[1]}`,
      };
    }
    return null;
  }

  return null;
}
