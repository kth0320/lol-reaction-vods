export type PlatformFilter = "all" | string;

export type LiveCastFilterInput = {
  platform: string;
};

export function filterLiveCasts<T extends LiveCastFilterInput>(casts: T[], platform: PlatformFilter): T[] {
  if (platform === "all") return casts;
  return casts.filter((cast) => cast.platform === platform);
}
