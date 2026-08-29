export const LIVE_INGEST_PLATFORMS = ["chzzk", "soop", "twitch"] as const;
export const VOD_INGEST_PLATFORMS = ["youtube", "chzzk", "soop"] as const;

export type LiveIngestPlatform = (typeof LIVE_INGEST_PLATFORMS)[number];
export type VodIngestPlatform = (typeof VOD_INGEST_PLATFORMS)[number];

export function isLiveIngestPlatform(platform: string): platform is LiveIngestPlatform {
  return (LIVE_INGEST_PLATFORMS as readonly string[]).includes(platform);
}

export function isVodIngestPlatform(platform: string): platform is VodIngestPlatform {
  return (VOD_INGEST_PLATFORMS as readonly string[]).includes(platform);
}

/** Twitch native VODs expire; those casters' 다시보기는 YouTube only. */
export function shouldFetchVods(platform: string): boolean {
  return platform !== "twitch" && isVodIngestPlatform(platform);
}
