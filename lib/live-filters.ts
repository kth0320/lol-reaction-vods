export type PlatformFilter = "all" | string;

export const MIN_LIVE_VIEWERS = 30;

export type LiveCastFilterInput = {
  platform: string;
  viewerCount?: number | null;
};

export function filterLiveCasts<T extends LiveCastFilterInput>(casts: T[], platform: PlatformFilter): T[] {
  const visible = casts.filter((cast) => (cast.viewerCount ?? 0) >= MIN_LIVE_VIEWERS);
  if (platform === "all") return visible;
  return visible.filter((cast) => cast.platform === platform);
}
