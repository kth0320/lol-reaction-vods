/** Seed may only wipe an empty database. Any collected rows stay. */
export function seedShouldWipe(existing: {
  reactionVods: number;
  matches: number;
  liveTitles: number;
}): boolean {
  return existing.reactionVods === 0 && existing.matches === 0 && existing.liveTitles === 0;
}
