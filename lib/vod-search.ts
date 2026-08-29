export type VodSearchTeam = {
  abbr: string;
  name: string;
  aliases: string[];
};

export type VodSearchableMatch = {
  blue: VodSearchTeam;
  red: VodSearchTeam;
};

export function normalizeVodQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** KT must not hit SKT; 케이티 still matches the Korean alias. */
export function teamFieldMatchesQuery(field: string, query: string): boolean {
  const hay = field.trim();
  const needle = query.trim();
  if (hay.length === 0 || needle.length < 2) return false;
  if (/^[A-Za-z0-9]+$/.test(needle) && needle.length <= 4) {
    return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(needle)}([^A-Za-z0-9]|$)`, "i").test(hay);
  }
  return hay.toLowerCase().includes(needle.toLowerCase());
}

export function teamMatchesQuery(team: VodSearchTeam, query: string): boolean {
  return [team.abbr, team.name, ...team.aliases].some((field) => teamFieldMatchesQuery(field, query));
}

export function filterVodMatches<T extends VodSearchableMatch>(rows: T[], query: string): T[] {
  const tokens = normalizeVodQuery(query);
  if (tokens.length === 0) return rows;
  return rows.filter((row) =>
    tokens.every((token) => teamMatchesQuery(row.blue, token) || teamMatchesQuery(row.red, token)),
  );
}
