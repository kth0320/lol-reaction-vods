export function normalizeVodQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function vodMatchHaystack(parts: string[]): string {
  return parts
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

export function filterVodMatches<T extends { haystack: string }>(rows: T[], query: string): T[] {
  const tokens = normalizeVodQuery(query);
  if (tokens.length === 0) return rows;
  return rows.filter((row) => tokens.every((token) => row.haystack.includes(token)));
}
