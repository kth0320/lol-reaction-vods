import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readCreatorChannels, readCreatorWhitelist } from "../lib/creators";

const prisma = new PrismaClient();
const root = join(import.meta.dirname, "..");

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8")) as T;
}

type TeamRow = { id: string; name: string; abbr: string; league?: string; aliases: string[] };
type MatchRow = {
  id: string;
  tournament: string;
  split: string;
  bestOf: number;
  status?: string;
  startsAt: string;
  blueTeamId: string;
  redTeamId: string;
};
type ReactionRow = {
  matchId: string;
  creatorId: string;
  platform: string;
  title: string;
  url: string;
  externalId: string;
  publishedAt?: string;
};
type LiveCastRow = {
  matchId: string;
  creatorId: string;
  platform: string;
  title: string;
  url: string;
  externalId: string;
  supportingTeamId: string | null;
};

async function main() {
  const teams = readJson<TeamRow[]>("data/teams.json");
  const creators = readCreatorWhitelist(root);
  const channels = readCreatorChannels(root);
  const vodMatches = readJson<MatchRow[]>("data/matches/lck-2026-summer.json");
  const liveMatches = readJson<MatchRow[]>("data/matches/live-now.json");
  const matches = [...vodMatches, ...liveMatches];
  const reactions = readJson<ReactionRow[]>("data/reactions/seed.json");
  const liveCasts = readJson<LiveCastRow[]>("data/live-casts/seed.json");

  await prisma.liveCandidate.deleteMany();
  await prisma.liveCast.deleteMany();
  await prisma.reactionVod.deleteMany();
  await prisma.creatorChannel.deleteMany();
  await prisma.match.deleteMany();
  await prisma.creator.deleteMany();
  await prisma.teamAlias.deleteMany();
  await prisma.team.deleteMany();

  for (const team of teams) {
    await prisma.team.create({
      data: {
        id: team.id,
        name: team.name,
        abbr: team.abbr,
        league: team.league ?? "",
        aliases: {
          create: team.aliases.map((alias) => ({ alias })),
        },
      },
    });
  }

  for (const creator of creators) {
    await prisma.creator.create({
      data: {
        id: creator.id,
        name: creator.name,
        kind: creator.kind,
        ingestEnabled: Boolean(creator.ingestEnabled),
        defaultSupportingTeamId: creator.defaultSupportingTeamId ?? null,
      },
    });
  }

  for (const channel of channels) {
    await prisma.creatorChannel.create({
      data: {
        creatorId: channel.creatorId,
        platform: channel.platform,
        channelId: channel.channelId,
        url: channel.url,
      },
    });
  }

  for (const match of matches) {
    await prisma.match.create({
      data: {
        id: match.id,
        tournament: match.tournament,
        split: match.split,
        bestOf: match.bestOf,
        status: match.status ?? "ended",
        startsAt: new Date(match.startsAt),
        blueTeamId: match.blueTeamId,
        redTeamId: match.redTeamId,
      },
    });
  }

  for (const reaction of reactions) {
    await prisma.reactionVod.create({
      data: {
        matchId: reaction.matchId,
        creatorId: reaction.creatorId,
        platform: reaction.platform,
        title: reaction.title,
        url: reaction.url,
        externalId: reaction.externalId,
        publishedAt: reaction.publishedAt ? new Date(reaction.publishedAt) : null,
      },
    });
  }

  for (const liveCast of liveCasts) {
    await prisma.liveCast.create({
      data: {
        matchId: liveCast.matchId,
        creatorId: liveCast.creatorId,
        platform: liveCast.platform,
        title: liveCast.title,
        url: liveCast.url,
        externalId: liveCast.externalId,
        supportingTeamId: liveCast.supportingTeamId,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
