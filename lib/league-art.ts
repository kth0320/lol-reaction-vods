import { fetchLeagues, parseLeagues } from "@/lib/ingest/lolesports";
import type { BackgroundBroadcast } from "@/lib/ingest/official-stream";
import { hubMarkSrc, matchTournamentToHub } from "@/lib/vod-hub";

export const LEAGUE_ART_FRESH_MS = 6 * 60 * 60 * 1000;

/** Tournament labels used on matches → lolesports league slugs. */
export const TOURNAMENT_LEAGUE_SLUG: Record<string, string> = {
  LCK: "lck",
  LPL: "lpl",
  LEC: "lec",
  Worlds: "worlds",
  MSI: "msi",
  "First Stand": "first_stand",
  EWC: "ewc_lol",
};

const leagueArtState = globalThis as unknown as {
  leagueArtAt?: number;
  leagueArt?: Map<string, string>;
  leagueArtInflight?: Promise<Map<string, string>>;
};

export function parseLeagueArt(payload: unknown): Map<string, string> {
  const art = new Map<string, string>();
  for (const league of parseLeagues(payload)) {
    if (league.imageUrl) art.set(league.slug, league.imageUrl);
  }
  return art;
}

export function slugForTournament(tournament: string): string {
  const trimmed = tournament.trim();
  return TOURNAMENT_LEAGUE_SLUG[trimmed] ?? trimmed.toLowerCase();
}

export function localLeagueMark(tournament: string): string {
  const hub = matchTournamentToHub(tournament);
  return hub ? hubMarkSrc(hub) : "";
}

export function leagueArtForTournament(art: Map<string, string> | undefined, tournament: string): string {
  return localLeagueMark(tournament) || (art?.get(slugForTournament(tournament)) ?? "");
}

export async function fetchLeagueArt(fetchImpl: typeof fetch = fetch): Promise<Map<string, string>> {
  if (
    leagueArtState.leagueArt &&
    leagueArtState.leagueArtAt &&
    Date.now() - leagueArtState.leagueArtAt < LEAGUE_ART_FRESH_MS
  ) {
    return leagueArtState.leagueArt;
  }
  if (leagueArtState.leagueArtInflight) {
    return leagueArtState.leagueArtInflight;
  }
  const work = fetchLeagues(fetchImpl)
    .then((leagues) => {
      const art = new Map<string, string>();
      for (const league of leagues) {
        if (league.imageUrl) art.set(league.slug, league.imageUrl);
      }
      leagueArtState.leagueArt = art;
      leagueArtState.leagueArtAt = Date.now();
      return art;
    })
    .catch(() => leagueArtState.leagueArt ?? new Map<string, string>())
    .finally(() => {
      if (leagueArtState.leagueArtInflight === work) leagueArtState.leagueArtInflight = undefined;
    });
  leagueArtState.leagueArtInflight = work;
  return work;
}

export function hasMatchupPlate(art: {
  leagueImageUrl?: string | null;
  blueImageUrl?: string | null;
  redImageUrl?: string | null;
}): boolean {
  return Boolean(art.leagueImageUrl) || Boolean(art.blueImageUrl && art.redImageUrl);
}

/** Official league mark + team logos first. Muted stream only when that artwork is missing. */
export function resolveMatchArt(input: {
  tournament: string;
  leagueArt?: Map<string, string>;
  eventLeagueImageUrl?: string | null;
  eventBlueImageUrl?: string | null;
  eventRedImageUrl?: string | null;
  storedBlueImageUrl?: string | null;
  storedRedImageUrl?: string | null;
  broadcast?: BackgroundBroadcast | null;
}): {
  leagueImageUrl: string;
  blueImageUrl: string;
  redImageUrl: string;
  broadcast: BackgroundBroadcast | null;
} {
  const leagueImageUrl =
    localLeagueMark(input.tournament) ||
    (input.eventLeagueImageUrl ?? "").trim() ||
    (input.leagueArt ? leagueArtForTournament(input.leagueArt, input.tournament) : "");
  const blueImageUrl = (input.eventBlueImageUrl ?? "").trim() || (input.storedBlueImageUrl ?? "").trim();
  const redImageUrl = (input.eventRedImageUrl ?? "").trim() || (input.storedRedImageUrl ?? "").trim();
  const plate = hasMatchupPlate({ leagueImageUrl, blueImageUrl, redImageUrl });
  return {
    leagueImageUrl,
    blueImageUrl,
    redImageUrl,
    broadcast: plate ? null : (input.broadcast ?? null),
  };
}
