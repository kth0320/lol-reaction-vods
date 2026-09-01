import { estimatedSeriesMs } from "@/lib/ingest/schedule-map";

export const VOD_PREGAME_MS = 2 * 60 * 60 * 1000;
export const VOD_POST_EDIT_MS = 48 * 60 * 60 * 1000;

/** In-progress series stay on the live caster board. Replays attach after the match ends. */
export function matchAcceptsReactionVods(status: string): boolean {
  return status !== "live";
}

export function vodInMatchWindow(publishedAt: Date, matchStart: Date, bestOf: number): boolean {
  const published = publishedAt.getTime();
  const start = matchStart.getTime();
  if (!Number.isFinite(published) || !Number.isFinite(start)) return false;
  const open = start - VOD_PREGAME_MS;
  const close = start + estimatedSeriesMs(bestOf) + VOD_POST_EDIT_MS;
  return published >= open && published <= close;
}
