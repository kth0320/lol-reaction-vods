import type { AttachReactionInput, OpsCreatorDto, OpsMatchDetailDto, OpsMatchDto } from "@/lib/dto";
import { toOpsMatchDto, toOpsReactionDto } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import { hubMatchTournaments, isVodHubId } from "@/lib/vod-hub";
import { filterVodMatches } from "@/lib/vod-search";
import { parseVodUrl } from "@/lib/vod-url";

export const OPS_LIST_LIMIT = 80;

export class OpsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OpsError";
  }
}

export async function listOpsMatches(options: {
  q?: string;
  hub?: string;
  emptyOnly?: boolean;
}): Promise<OpsMatchDto[]> {
  const hub = options.hub && isVodHubId(options.hub) ? options.hub : null;
  const rows = await prisma.match.findMany({
    where: {
      status: "ended",
      ...(hub ? { tournament: { in: hubMatchTournaments(hub) } } : {}),
    },
    include: {
      blueTeam: { include: { aliases: true } },
      redTeam: { include: { aliases: true } },
      _count: { select: { reactions: true } },
    },
    orderBy: { startsAt: "desc" },
  });
  const searchable = rows.map((row) => ({
    ...row,
    blue: {
      abbr: row.blueTeam.abbr,
      name: row.blueTeam.name,
      aliases: row.blueTeam.aliases.map((alias) => alias.alias),
    },
    red: {
      abbr: row.redTeam.abbr,
      name: row.redTeam.name,
      aliases: row.redTeam.aliases.map((alias) => alias.alias),
    },
  }));
  const filtered = filterVodMatches(searchable, options.q ?? "").filter((row) =>
    options.emptyOnly ? row._count.reactions === 0 : true,
  );
  return filtered.slice(0, OPS_LIST_LIMIT).map(toOpsMatchDto);
}

export async function getOpsMatch(id: string): Promise<OpsMatchDetailDto> {
  const row = await prisma.match.findUnique({
    where: { id },
    include: {
      blueTeam: true,
      redTeam: true,
      _count: { select: { reactions: true } },
      reactions: { include: { creator: true }, orderBy: { publishedAt: "asc" } },
    },
  });
  if (!row) throw new OpsError("경기를 찾을 수 없습니다.", 404);
  return {
    ...toOpsMatchDto(row),
    reactions: row.reactions.map(toOpsReactionDto),
  };
}

export async function listOpsCreators(): Promise<OpsCreatorDto[]> {
  const rows = await prisma.creator.findMany({
    where: { ingestEnabled: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return rows;
}

export async function detachReaction(id: string): Promise<void> {
  try {
    await prisma.reactionVod.delete({ where: { id } });
  } catch {
    throw new OpsError("리액션을 찾을 수 없습니다.", 404);
  }
}

export async function attachReaction(input: AttachReactionInput) {
  const matchId = input.matchId.trim();
  const creatorId = input.creatorId.trim();
  const parsed = parseVodUrl(input.url);
  if (!matchId || !creatorId) throw new OpsError("경기와 방송인을 고르세요.", 400);
  if (!parsed) throw new OpsError("YouTube·치지직·숲 다시보기 주소만 붙일 수 있습니다.", 400);

  const [match, creator] = await Promise.all([
    prisma.match.findUnique({ where: { id: matchId }, select: { id: true } }),
    prisma.creator.findUnique({ where: { id: creatorId }, select: { id: true } }),
  ]);
  if (!match) throw new OpsError("경기를 찾을 수 없습니다.", 404);
  if (!creator) throw new OpsError("방송인을 찾을 수 없습니다.", 404);

  const title = input.title?.trim() || "수동 보정";
  const row = await prisma.reactionVod.upsert({
    where: { platform_externalId: { platform: parsed.platform, externalId: parsed.externalId } },
    create: {
      matchId,
      creatorId,
      platform: parsed.platform,
      title,
      url: parsed.canonicalUrl,
      externalId: parsed.externalId,
      publishedAt: new Date(),
    },
    update: {
      matchId,
      creatorId,
      title: input.title?.trim() || undefined,
      url: parsed.canonicalUrl,
    },
    include: { creator: true },
  });
  return toOpsReactionDto(row);
}
