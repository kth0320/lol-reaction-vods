import { soopProfileImageUrl } from "@/lib/ingest/live-status";

const IMAGE_PLATFORM_ORDER = ["chzzk", "soop", "twitch", "youtube"] as const;

export function creatorProfileImage(input: {
  preferredPlatform?: string;
  candidates?: { platform: string; imageUrl: string }[];
  channels?: { platform: string; channelId: string }[];
}): string {
  const candidates = input.candidates ?? [];
  const preferred = input.preferredPlatform
    ? candidates.find((row) => row.platform === input.preferredPlatform && row.imageUrl.trim())
    : undefined;
  if (preferred) return preferred.imageUrl.trim();
  for (const platform of IMAGE_PLATFORM_ORDER) {
    const hit = candidates.find((row) => row.platform === platform && row.imageUrl.trim());
    if (hit) return hit.imageUrl.trim();
  }
  const any = candidates.find((row) => row.imageUrl.trim());
  if (any) return any.imageUrl.trim();
  const soop = input.channels?.find((row) => row.platform === "soop" && row.channelId.trim());
  return soop ? soopProfileImageUrl(soop.channelId.trim()) : "";
}
