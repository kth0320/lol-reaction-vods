import { prisma } from "@/lib/prisma";

/** Durable per-match roster. liveCandidate is current-only and gets wiped. */
export async function persistLiveCast(options: {
  matchId: string;
  creatorId: string;
  platform: string;
  title: string;
  url: string;
  externalId: string;
  supportingTeamId?: string | null;
}): Promise<void> {
  const title = options.title.trim();
  if (!title) return;
  await prisma.liveCast.upsert({
    where: {
      matchId_creatorId_platform: {
        matchId: options.matchId,
        creatorId: options.creatorId,
        platform: options.platform,
      },
    },
    create: {
      matchId: options.matchId,
      creatorId: options.creatorId,
      platform: options.platform,
      title,
      url: options.url,
      externalId: options.externalId,
      supportingTeamId: options.supportingTeamId ?? null,
    },
    update: {
      title,
      url: options.url,
      externalId: options.externalId,
      ...(options.supportingTeamId !== undefined
        ? { supportingTeamId: options.supportingTeamId }
        : {}),
    },
  });
}
