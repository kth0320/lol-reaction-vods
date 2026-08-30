import { fetchEventDetails, httpsAssetUrl } from "@/lib/ingest/lolesports";
import { seriesIsDecided } from "@/lib/ingest/schedule-map";
import { twitchEmbedSrc } from "@/lib/playback";

export type EventStream = {
  provider: string;
  parameter: string;
  locale: string;
};

export type BackgroundBroadcast = {
  provider: "twitch" | "youtube" | "soop";
  id: string;
};

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseEventStreams(payload: unknown): EventStream[] {
  const event = asRecord(asRecord(payload)?.data)?.event ?? asRecord(payload)?.event;
  const list = asRecord(event)?.streams;
  if (!Array.isArray(list)) return [];
  const rows: EventStream[] = [];
  for (const item of list) {
    const row = asRecord(item);
    const provider = text(row?.provider).toLowerCase();
    const parameter = text(row?.parameter);
    if (!provider || !parameter) continue;
    rows.push({
      provider,
      parameter,
      locale: text(row?.locale) || text(asRecord(row?.mediaLocale)?.locale),
    });
  }
  return rows;
}

function asBroadcast(stream: EventStream): BackgroundBroadcast | null {
  if (stream.provider === "youtube") return { provider: "youtube", id: stream.parameter };
  if (stream.provider === "twitch") return { provider: "twitch", id: stream.parameter };
  if (stream.provider === "afreecatv" || stream.provider === "soop") {
    return { provider: "soop", id: stream.parameter };
  }
  return null;
}

/** Prefer feeds that can actually mute in an iframe (YouTube, then Twitch, then SOOP). */
export function pickMutedBackground(streams: EventStream[]): BackgroundBroadcast | null {
  const mapped = streams.map(asBroadcast).filter((row): row is BackgroundBroadcast => Boolean(row));
  return (
    mapped.find((row) => row.provider === "youtube") ??
    mapped.find((row) => row.provider === "twitch") ??
    mapped.find((row) => row.provider === "soop") ??
    null
  );
}

export function mutedBroadcastSrc(broadcast: BackgroundBroadcast, parentHost: string): string {
  if (broadcast.provider === "youtube") {
    const id = encodeURIComponent(broadcast.id);
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0`;
  }
  if (broadcast.provider === "twitch") {
    return twitchEmbedSrc(broadcast.id, parentHost, { live: true, autoplay: true, muted: true });
  }
  return `https://play.sooplive.com/${encodeURIComponent(broadcast.id)}/embed`;
}

export type EventGame = {
  number: number;
  state: string;
};

export function parseEventGames(payload: unknown): EventGame[] {
  const event = asRecord(asRecord(payload)?.data)?.event ?? asRecord(payload)?.event;
  const match = asRecord(asRecord(event)?.match);
  const list = match?.games;
  if (!Array.isArray(list)) return [];
  const rows: EventGame[] = [];
  for (const item of list) {
    const row = asRecord(item);
    const number = typeof row?.number === "number" && Number.isFinite(row.number) ? Math.floor(row.number) : 0;
    const state = text(row?.state);
    if (!state) continue;
    rows.push({ number, state });
  }
  return rows;
}

export function parseEventGameWins(payload: unknown): [number | null, number | null] {
  const event = asRecord(asRecord(payload)?.data)?.event ?? asRecord(payload)?.event;
  const match = asRecord(asRecord(event)?.match);
  const teams = Array.isArray(match?.teams) ? match.teams : [];
  const wins = (index: number): number | null => {
    const raw = asRecord(asRecord(teams[index])?.result)?.gameWins;
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
    return null;
  };
  return [wins(0), wins(1)];
}

/** getSchedule `completed` can be stale; a game still inProgress (or an unfinished series) is live. */
export function eventSeriesIsLive(payload: unknown, bestOf: number): boolean {
  const games = parseEventGames(payload);
  if (games.some((game) => game.state === "inProgress")) return true;
  const [blueWins, redWins] = parseEventGameWins(payload);
  if (seriesIsDecided(bestOf, blueWins, redWins)) return false;
  return games.some((game) => game.state === "unstarted" || game.state === "inProgress");
}

export type EventLook = {
  broadcast: BackgroundBroadcast | null;
  leagueImageUrl: string;
  blueImageUrl: string;
  redImageUrl: string;
};

export function parseEventLook(payload: unknown): EventLook {
  const event = asRecord(asRecord(payload)?.data)?.event ?? asRecord(payload)?.event;
  const league = asRecord(asRecord(event)?.league);
  const match = asRecord(asRecord(event)?.match);
  const teams = Array.isArray(match?.teams) ? match.teams : [];
  const blue = asRecord(teams[0]);
  const red = asRecord(teams[1]);
  return {
    broadcast: pickMutedBackground(parseEventStreams(payload)),
    leagueImageUrl: httpsAssetUrl(text(league?.image)),
    blueImageUrl: httpsAssetUrl(text(blue?.image)),
    redImageUrl: httpsAssetUrl(text(red?.image)),
  };
}

export async function lookForEvent(
  eventId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EventLook> {
  try {
    return parseEventLook(await fetchEventDetails(eventId, fetchImpl));
  } catch {
    return { broadcast: null, leagueImageUrl: "", blueImageUrl: "", redImageUrl: "" };
  }
}

export async function backgroundForEvent(
  eventId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BackgroundBroadcast | null> {
  return (await lookForEvent(eventId, fetchImpl)).broadcast;
}
