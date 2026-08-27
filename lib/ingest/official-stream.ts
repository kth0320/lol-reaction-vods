import { fetchEventDetails } from "@/lib/ingest/lolesports";

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
    const channel = encodeURIComponent(broadcast.id);
    const parents = [...new Set([parentHost, "localhost", "127.0.0.1"])]
      .filter(Boolean)
      .map((host) => `parent=${encodeURIComponent(host)}`)
      .join("&");
    return `https://player.twitch.tv/?channel=${channel}&${parents}&autoplay=true&muted=true`;
  }
  return `https://play.sooplive.com/${encodeURIComponent(broadcast.id)}/embed`;
}

export async function backgroundForEvent(
  eventId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BackgroundBroadcast | null> {
  try {
    return pickMutedBackground(parseEventStreams(await fetchEventDetails(eventId, fetchImpl)));
  } catch {
    return null;
  }
}
