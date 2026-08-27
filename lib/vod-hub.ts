export const VOD_HUB_INTERNATIONAL = [
  { id: "worlds", label: "롤드컵" },
  { id: "msi", label: "MSI" },
  { id: "first-stand", label: "퍼스트스탠드" },
  { id: "ewc", label: "EWC" },
] as const;

export const VOD_HUB_LEAGUES = [
  { id: "lck", label: "LCK" },
  { id: "lpl", label: "LPL" },
  { id: "lec", label: "LEC" },
] as const;

export const VOD_HUB_CARDS = [...VOD_HUB_INTERNATIONAL, ...VOD_HUB_LEAGUES] as const;

export type VodHubId = (typeof VOD_HUB_CARDS)[number]["id"];

const HUB_BY_ID = new Map(VOD_HUB_CARDS.map((card) => [card.id, card]));

const TOURNAMENT_TO_HUB: Record<string, VodHubId> = {
  LCK: "lck",
  LPL: "lpl",
  LEC: "lec",
  WORLDS: "worlds",
  MSI: "msi",
  EWC: "ewc",
  FIRSTSTAND: "first-stand",
  FIRST_STAND: "first-stand",
};

export function isVodHubId(value: string): value is VodHubId {
  return HUB_BY_ID.has(value as VodHubId);
}

export function vodHubCard(id: string) {
  return HUB_BY_ID.get(id as VodHubId) ?? null;
}

export function matchTournamentToHub(tournament: string): VodHubId | null {
  const key = tournament.trim().toUpperCase().replace(/[\s-]+/g, "");
  if (key === "롤드컵" || key === "WORLDS") return "worlds";
  if (key === "퍼스트스탠드" || key === "FIRSTSTAND") return "first-stand";
  return TOURNAMENT_TO_HUB[tournament.trim().toUpperCase()] ?? TOURNAMENT_TO_HUB[key] ?? null;
}

export function hubMatchTournaments(hubId: VodHubId): string[] {
  if (hubId === "lck") return ["LCK"];
  if (hubId === "lpl") return ["LPL"];
  if (hubId === "lec") return ["LEC"];
  if (hubId === "worlds") return ["Worlds", "WORLDS"];
  if (hubId === "msi") return ["MSI"];
  if (hubId === "ewc") return ["EWC"];
  return ["First Stand", "FIRST_STAND"];
}

export function countReactionsByHub(
  rows: { tournament: string; reactionCount: number }[],
): Record<VodHubId, number> {
  const counts = Object.fromEntries(VOD_HUB_CARDS.map((card) => [card.id, 0])) as Record<VodHubId, number>;
  for (const row of rows) {
    const hub = matchTournamentToHub(row.tournament);
    if (!hub) continue;
    counts[hub] += row.reactionCount;
  }
  return counts;
}
