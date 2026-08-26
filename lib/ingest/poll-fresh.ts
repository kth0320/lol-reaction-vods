export const LIVE_POLL_FRESH_MS = 30_000;

export function isLivePollFresh(
  fetchedAtMs: number | null | undefined,
  now = Date.now(),
  maxAgeMs = LIVE_POLL_FRESH_MS,
): boolean {
  return typeof fetchedAtMs === "number" && fetchedAtMs > 0 && now - fetchedAtMs < maxAgeMs;
}
