import { ALL_STAGE_ID, hubStageOptions } from "@/lib/vod-split";
import { isVodHubId, vodHubCard, type VodHubId } from "@/lib/vod-hub";

export type VodFilterQuery = {
  year: number;
  stage: string;
  q: string;
};

export function parseVodFilter(
  raw: { year?: string; stage?: string; q?: string },
  years: number[],
  hubId: VodHubId,
): VodFilterQuery {
  const parsedYear = Number(raw.year);
  const year = years.includes(parsedYear) ? parsedYear : (years[0] ?? 0);
  const stages = hubStageOptions(hubId, year);
  const stage = stages.some((option) => option.id === raw.stage) ? (raw.stage as string) : ALL_STAGE_ID;
  return { year, stage, q: raw.q?.trim() ?? "" };
}

export function vodHubPath(hubId: string, year: number, stage: string, q = ""): string {
  const params = new URLSearchParams();
  if (year > 0) params.set("year", String(year));
  if (stage && stage !== ALL_STAGE_ID) params.set("stage", stage);
  const trimmed = q.trim();
  if (trimmed) params.set("q", trimmed);
  const search = params.toString();
  return search ? `/vods/${hubId}?${search}` : `/vods/${hubId}`;
}

export function vodMatchPath(matchId: string, hubId: string, year: number, stage: string, q = ""): string {
  const params = new URLSearchParams();
  params.set("hub", hubId);
  if (year > 0) params.set("year", String(year));
  if (stage && stage !== ALL_STAGE_ID) params.set("stage", stage);
  const trimmed = q.trim();
  if (trimmed) params.set("q", trimmed);
  return `/matches/${matchId}?${params.toString()}`;
}

export function vodHubReturnPath(
  hubId: string | null,
  yearRaw: string | undefined,
  stageRaw: string | undefined,
  qRaw?: string,
): string {
  if (!hubId || !isVodHubId(hubId)) return "/";
  const params = new URLSearchParams();
  if (yearRaw) params.set("year", yearRaw);
  if (stageRaw && stageRaw !== ALL_STAGE_ID) params.set("stage", stageRaw);
  const trimmed = qRaw?.trim();
  if (trimmed) params.set("q", trimmed);
  const search = params.toString();
  return search ? `/vods/${hubId}?${search}` : `/vods/${hubId}`;
}

export function vodMatchBack(
  live: boolean,
  hubId: string | null,
  yearRaw?: string,
  stageRaw?: string,
  qRaw?: string,
): { href: string; label: string } {
  if (live) return { href: "/", label: "← 메인" };
  const href = vodHubReturnPath(hubId, yearRaw, stageRaw, qRaw);
  if (href === "/") return { href: "/", label: "← 메인" };
  const card = hubId && isVodHubId(hubId) ? vodHubCard(hubId) : null;
  return { href, label: `← ${card?.label ?? "다시보기"}` };
}
