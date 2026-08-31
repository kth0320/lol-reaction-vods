import { prisma } from "@/lib/prisma";

const TITLE_NEAR_MS = 18 * 60 * 60 * 1000;

export async function recordLiveTitle(options: {
  creatorId: string;
  platform: string;
  title: string;
  matchId: string | null;
  isLive: boolean;
}): Promise<void> {
  const title = options.title.trim();
  if (!options.isLive || title.length < 4) return;
  const last = await prisma.liveTitleHistory.findFirst({
    where: { creatorId: options.creatorId, platform: options.platform },
    orderBy: { seenAt: "desc" },
  });
  if (last && last.title === title) return;
  await prisma.liveTitleHistory.create({
    data: {
      creatorId: options.creatorId,
      platform: options.platform,
      title,
      matchId: options.matchId,
    },
  });
}

export function extraTitlesForVod(options: {
  currentTitle: string;
  publishedAt: Date | null;
  rows: { title: string; seenAt: Date; matchId: string | null }[];
}): string[] {
  const titles = [options.currentTitle.trim()].filter(Boolean);
  const anchor = options.publishedAt?.getTime() ?? Date.now();
  for (const row of options.rows) {
    const title = row.title.trim();
    if (!title || titles.includes(title)) continue;
    if (Math.abs(row.seenAt.getTime() - anchor) > TITLE_NEAR_MS) continue;
    titles.push(title);
  }
  return titles;
}

export function liveTitleMatchIdsForVod(options: {
  publishedAt: Date | null;
  rows: { seenAt: Date; matchId: string | null }[];
}): string[] {
  const anchor = options.publishedAt?.getTime() ?? Date.now();
  const ids: string[] = [];
  for (const row of options.rows) {
    if (!row.matchId || ids.includes(row.matchId)) continue;
    if (Math.abs(row.seenAt.getTime() - anchor) > TITLE_NEAR_MS) continue;
    ids.push(row.matchId);
  }
  return ids;
}
