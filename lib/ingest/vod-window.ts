import { estimatedSeriesMs } from "@/lib/ingest/schedule-map";

export const VOD_PREGAME_MS = 2 * 60 * 60 * 1000;
export const VOD_POST_EDIT_MS = 48 * 60 * 60 * 1000;
/** Hourly/auto ingest only looks at matches whose series ended this recently. */
export const VOD_RECENT_ENDED_MS = 24 * 60 * 60 * 1000;
/** A series can run long. Past this, a stuck "live" row must not pause replay ingest forever. */
export const VOD_LIVE_BLOCK_GRACE_MS = 2 * 60 * 60 * 1000;

/** In-progress series stay on the live caster board. Replays attach after the match ends. */
export function matchAcceptsReactionVods(status: string): boolean {
  return status !== "live";
}

export function estimatedMatchEndedAt(startsAt: Date, bestOf: number, now = Date.now()): number {
  return Math.min(startsAt.getTime() + estimatedSeriesMs(bestOf), now);
}

/** Ended matches whose estimated end is still inside `windowMs`. */
export function matchEndedWithin(
  match: { status: string; startsAt: Date; bestOf: number },
  windowMs = VOD_RECENT_ENDED_MS,
  now = Date.now(),
): boolean {
  if (match.status !== "ended") return false;
  const endedAt = estimatedMatchEndedAt(match.startsAt, match.bestOf, now);
  return now - endedAt <= windowMs;
}

/** While a series is actually on air, the board only needs live rows. Replays wait. */
export function matchBlocksVodIngest(
  match: { status: string; startsAt: Date; bestOf: number },
  now = Date.now(),
): boolean {
  if (match.status !== "live") return false;
  const start = match.startsAt.getTime();
  if (now < start) return true;
  return now - start <= estimatedSeriesMs(match.bestOf) + VOD_LIVE_BLOCK_GRACE_MS;
}

export function vodInMatchWindow(publishedAt: Date, matchStart: Date, bestOf: number): boolean {
  const published = publishedAt.getTime();
  const start = matchStart.getTime();
  if (!Number.isFinite(published) || !Number.isFinite(start)) return false;
  const open = start - VOD_PREGAME_MS;
  const close = start + estimatedSeriesMs(bestOf) + VOD_POST_EDIT_MS;
  return published >= open && published <= close;
}
