import { inferLiveMatchFromTitle, type InferTeam } from "@/lib/ingest/infer-match";
import { pickPrototypeLiveMatch, type TitleMatchInput } from "@/lib/ingest/match-title";
import { attachInferredToOfficial } from "@/lib/ingest/schedule-map";

export type OfficialLiveMatch = {
  id: string;
  tournament: string;
  blueTeamId: string;
  redTeamId: string;
  status: string;
  startsAt: Date;
  blueTeam: { abbr: string; name: string; aliases: { alias: string }[] };
  redTeam: { abbr: string; name: string; aliases: { alias: string }[] };
};

function teamAliases(team: OfficialLiveMatch["blueTeam"]): string[] {
  return [team.abbr, team.name, ...team.aliases.map((row) => row.alias)];
}

function titleInputs(matches: OfficialLiveMatch[]): TitleMatchInput[] {
  return matches.map((match) => ({
    id: match.id,
    tournament: match.tournament,
    blueAliases: teamAliases(match.blueTeam),
    redAliases: teamAliases(match.redTeam),
  }));
}

function officialInferTeams(official: OfficialLiveMatch[]): InferTeam[] {
  const byId = new Map<string, InferTeam>();
  for (const match of official) {
    if (!byId.has(match.blueTeamId)) {
      byId.set(match.blueTeamId, { id: match.blueTeamId, league: match.tournament, aliases: teamAliases(match.blueTeam) });
    }
    if (!byId.has(match.redTeamId)) {
      byId.set(match.redTeamId, { id: match.redTeamId, league: match.tournament, aliases: teamAliases(match.redTeam) });
    }
  }
  return [...byId.values()];
}

export function attachTitleToOfficial(title: string, official: OfficialLiveMatch[]): OfficialLiveMatch | null {
  const inferred = inferLiveMatchFromTitle(title, officialInferTeams(official));
  const attachedId = inferred ? attachInferredToOfficial(inferred, official) : null;
  const byInfer = attachedId ? official.find((match) => match.id === attachedId) ?? null : null;
  if (byInfer) return byInfer;
  const picked = pickPrototypeLiveMatch(title, titleInputs(official));
  return picked ? official.find((match) => match.id === picked.id) ?? null : null;
}
