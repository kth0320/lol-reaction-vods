/** Creators seen live on an ended match that still has no reaction from them. */
export function creatorIdsWaitingForReplay(options: {
  liveTitles: { creatorId: string; matchId: string | null }[];
  endedMatchIds: ReadonlySet<string>;
  attached: { creatorId: string; matchId: string }[];
}): Set<string> {
  const have = new Set(options.attached.map((row) => `${row.creatorId}\0${row.matchId}`));
  const waiting = new Set<string>();
  for (const row of options.liveTitles) {
    if (!row.matchId || !options.endedMatchIds.has(row.matchId)) continue;
    if (have.has(`${row.creatorId}\0${row.matchId}`)) continue;
    waiting.add(row.creatorId);
  }
  return waiting;
}
