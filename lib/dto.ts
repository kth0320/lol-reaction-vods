export type OpsMatchDto = {
  id: string;
  tournament: string;
  split: string;
  bestOf: number;
  startsAt: string;
  blueAbbr: string;
  blueName: string;
  redAbbr: string;
  redName: string;
  reactionCount: number;
};

export type OpsReactionDto = {
  id: string;
  matchId: string;
  creatorId: string;
  creatorName: string;
  platform: string;
  title: string;
  url: string;
  externalId: string;
  publishedAt: string | null;
};

export type OpsCreatorDto = {
  id: string;
  name: string;
};

export type OpsMatchDetailDto = OpsMatchDto & {
  reactions: OpsReactionDto[];
};

export type AttachReactionInput = {
  matchId: string;
  creatorId: string;
  url: string;
  title?: string;
};

export function toOpsMatchDto(row: {
  id: string;
  tournament: string;
  split: string;
  bestOf: number;
  startsAt: Date;
  blueTeam: { abbr: string; name: string };
  redTeam: { abbr: string; name: string };
  _count: { reactions: number };
}): OpsMatchDto {
  return {
    id: row.id,
    tournament: row.tournament,
    split: row.split,
    bestOf: row.bestOf,
    startsAt: row.startsAt.toISOString(),
    blueAbbr: row.blueTeam.abbr,
    blueName: row.blueTeam.name,
    redAbbr: row.redTeam.abbr,
    redName: row.redTeam.name,
    reactionCount: row._count.reactions,
  };
}

export function toOpsReactionDto(row: {
  id: string;
  matchId: string;
  creatorId: string;
  creator: { name: string };
  platform: string;
  title: string;
  url: string;
  externalId: string;
  publishedAt: Date | null;
}): OpsReactionDto {
  return {
    id: row.id,
    matchId: row.matchId,
    creatorId: row.creatorId,
    creatorName: row.creator.name,
    platform: row.platform,
    title: row.title,
    url: row.url,
    externalId: row.externalId,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}
