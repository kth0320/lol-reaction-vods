import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import type { InferTeam } from "@/lib/ingest/infer-match";

type TeamFileRow = {
  id: string;
  name: string;
  abbr: string;
  league?: string;
  aliases: string[];
};

export function readTeamCatalog(root = process.cwd()): TeamFileRow[] {
  return JSON.parse(readFileSync(join(root, "data", "teams.json"), "utf8")) as TeamFileRow[];
}

export async function ensureTeamCatalog(root = process.cwd()): Promise<InferTeam[]> {
  const rows = readTeamCatalog(root);
  for (const team of rows) {
    await prisma.team.upsert({
      where: { id: team.id },
      create: {
        id: team.id,
        name: team.name,
        abbr: team.abbr,
        league: team.league ?? "",
        aliases: { create: team.aliases.map((alias) => ({ alias })) },
      },
      update: {
        name: team.name,
        abbr: team.abbr,
        league: team.league ?? "",
      },
    });
    for (const alias of team.aliases) {
      await prisma.teamAlias.upsert({
        where: { teamId_alias: { teamId: team.id, alias } },
        create: { teamId: team.id, alias },
        update: {},
      });
    }
  }

  const stored = await prisma.team.findMany({ include: { aliases: true } });
  return stored.map((team) => ({
    id: team.id,
    league: team.league,
    aliases: [team.name, team.abbr, ...team.aliases.map((row) => row.alias)],
  }));
}
