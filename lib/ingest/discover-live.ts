import { attachTitleToOfficial, type OfficialLiveMatch } from "@/lib/ingest/attach-live";
import { prisma } from "@/lib/prisma";

const SEARCH_KEYWORDS = ["LCK", "LPL", "LEC", "롤드컵", "Worlds", "MSI", "퍼스트스탠드"];
const SKIP_NAME = /^(LCK|LPL|LEC|LCK_KR|LCK CL|LoL Esports|리그 오브 레전드|Riot Games)$/i;
const SKIP_TITLE = /\bLCK\s*CL\b|LCKC\b|챌린저스|LPL\s*CL\b/i;
const SKIP_TWITCH_LOGIN = /^(lck|lpl|lec)(_|$)|riotgames|lolesports/i;
const SKIP_SOOP_ID = /^(aflol|lck|lpl|lec)(_|$)/i;
const TWITCH_GQL_CLIENT_ID = process.env.TWITCH_GQL_CLIENT_ID ?? "kimne78kx3ncx6brgo4mv6wki5h1ko";
const USER_AGENT = "Mozilla/5.0 (compatible; lol-reaction-vods-prototype/0.1)";
const CHZZK_POPULAR_PAGES = 8;
const SOOP_SEARCH_PAGES = 4;
const DISCOVER_MIN_VIEWERS = 40;

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function viewerCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.floor(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return 0;
}

function byViewers(a: DiscoveredLive, b: DiscoveredLive): number {
  return (b.viewerCount ?? 0) - (a.viewerCount ?? 0);
}

export type DiscoveredLive = {
  platform: "chzzk" | "soop" | "twitch";
  channelId: string;
  name: string;
  title: string;
  url: string;
  viewerCount?: number;
};

function keepDiscovered(live: Pick<DiscoveredLive, "name" | "title" | "channelId" | "platform">): boolean {
  if (!live.channelId || !live.name || !live.title) return false;
  if (SKIP_NAME.test(live.name) || SKIP_TITLE.test(live.title)) return false;
  if (live.platform === "twitch" && SKIP_TWITCH_LOGIN.test(live.channelId)) return false;
  if (live.platform === "soop" && SKIP_SOOP_ID.test(live.channelId)) return false;
  return true;
}

export type ChzzkPopularCursor = {
  concurrentUserCount: number;
  liveId: string;
};

export function chzzkPopularLivesUrl(cursor?: ChzzkPopularCursor): string {
  const params = new URLSearchParams({ sortType: "POPULAR" });
  if (cursor) {
    params.set("concurrentUserCount", String(cursor.concurrentUserCount));
    params.set("liveId", cursor.liveId);
  }
  return `https://api.chzzk.naver.com/service/v2/categories/GAME/League_of_Legends/lives?${params}`;
}

export function soopLiveSearchUrl(keyword: string, page = 1): string {
  return `https://sch.sooplive.co.kr/api.php?m=liveSearch&v=1.0&szOrder=view_cnt&nPageNo=${page}&nListCnt=20&szKeyword=${encodeURIComponent(keyword)}`;
}

export function parseChzzkPopularNext(payload: unknown): ChzzkPopularCursor | null {
  const row = asRecord(asRecord(asRecord(payload)?.content)?.page)?.next;
  if (!row || row.liveId == null || row.concurrentUserCount == null) return null;
  return { concurrentUserCount: viewerCount(row.concurrentUserCount), liveId: String(row.liveId) };
}

export function parseChzzkSearchLives(payload: unknown): DiscoveredLive[] {
  const content = asRecord(asRecord(payload)?.content);
  const data = content?.data ?? content?.liveInfoResponseList;
  if (!Array.isArray(data)) return [];
  const rows: DiscoveredLive[] = [];
  for (const item of data) {
    const row = asRecord(item);
    const live = asRecord(row?.live) ?? row;
    if (!live) continue;
    const channel = asRecord(row?.channel) ?? asRecord(live.channel);
    const channelId = text(live.channelId) || text(channel?.channelId);
    const name = text(channel?.channelName);
    const title = text(live.liveTitle);
    const candidate: DiscoveredLive = {
      platform: "chzzk",
      channelId,
      name,
      title,
      url: `https://chzzk.naver.com/${channelId}`,
      viewerCount: viewerCount(live.concurrentUserCount),
    };
    if (!keepDiscovered(candidate)) continue;
    rows.push(candidate);
  }
  return rows.sort(byViewers);
}

export function parseTwitchSearchChannels(payload: unknown): DiscoveredLive[] {
  const items = asRecord(asRecord(asRecord(payload)?.data)?.searchFor)?.channels;
  const list = asRecord(items)?.items;
  if (!Array.isArray(list)) return [];
  const rows: DiscoveredLive[] = [];
  for (const item of list) {
    const row = asRecord(item);
    const stream = asRecord(row?.stream);
    if (text(stream?.type).toLowerCase() !== "live") continue;
    const channelId = text(row?.login).toLowerCase();
    const name = text(row?.displayName) || channelId;
    const title = text(stream?.title);
    const candidate: DiscoveredLive = {
      platform: "twitch",
      channelId,
      name,
      title,
      url: `https://www.twitch.tv/${encodeURIComponent(channelId)}`,
      viewerCount: viewerCount(stream?.viewersCount),
    };
    if (!keepDiscovered(candidate)) continue;
    rows.push(candidate);
  }
  return rows.sort(byViewers);
}

export function parseSoopSearchLives(payload: unknown): DiscoveredLive[] {
  const data = asRecord(payload)?.REAL_BROAD;
  if (!Array.isArray(data)) return [];
  const rows: DiscoveredLive[] = [];
  for (const item of data) {
    const row = asRecord(item);
    const channelId = text(row?.user_id);
    const name = text(row?.user_nick) || text(row?.station_name) || channelId;
    const title = text(row?.broad_title);
    const candidate: DiscoveredLive = {
      platform: "soop",
      channelId,
      name,
      title,
      url: `https://play.sooplive.com/${encodeURIComponent(channelId)}`,
      viewerCount: viewerCount(row?.total_view_cnt) || viewerCount(row?.current_view_cnt),
    };
    if (!keepDiscovered(candidate)) continue;
    rows.push(candidate);
  }
  return rows.sort(byViewers);
}

export function discoveredCreatorId(platform: string, channelId: string): string {
  return `disc-${platform}-${channelId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)}`;
}

async function fetchJson(fetchImpl: typeof fetch, url: string): Promise<unknown | null> {
  const response = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT }, cache: "no-store" });
  if (!response.ok) return null;
  return JSON.parse(await response.text()) as unknown;
}

async function fetchChzzkPopularLives(fetchImpl: typeof fetch): Promise<DiscoveredLive[]> {
  const seen = new Set<string>();
  const rows: DiscoveredLive[] = [];
  let cursor: ChzzkPopularCursor | undefined;
  for (let page = 0; page < CHZZK_POPULAR_PAGES; page++) {
    const payload = await fetchJson(fetchImpl, chzzkPopularLivesUrl(cursor));
    if (!payload) break;
    for (const live of parseChzzkSearchLives(payload)) {
      if (seen.has(live.channelId)) continue;
      seen.add(live.channelId);
      rows.push(live);
    }
    const following = parseChzzkPopularNext(payload);
    if (!following || (cursor && following.liveId === cursor.liveId)) break;
    if (following.concurrentUserCount < DISCOVER_MIN_VIEWERS) break;
    cursor = following;
  }
  return rows.sort(byViewers);
}

async function fetchTwitchSearch(keyword: string, fetchImpl: typeof fetch): Promise<DiscoveredLive[]> {
  const response = await fetchImpl("https://gql.twitch.tv/gql", {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Client-ID": TWITCH_GQL_CLIENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query:
        "query($query:String!){ searchFor(userQuery:$query, platform:\"web\"){ channels { items { login displayName stream { title type viewersCount } } } } }",
      variables: { query: keyword },
    }),
    cache: "no-store",
  });
  if (!response.ok) return [];
  return parseTwitchSearchChannels(JSON.parse(await response.text()) as unknown);
}

function soopListEnded(payload: unknown): boolean {
  const flag = asRecord(payload)?.HAS_MORE_LIST;
  return flag === false || flag === 0 || flag === "0" || flag === "false";
}

async function fetchSoopSearch(keyword: string, fetchImpl: typeof fetch): Promise<DiscoveredLive[]> {
  const seen = new Set<string>();
  const rows: DiscoveredLive[] = [];
  for (let page = 1; page <= SOOP_SEARCH_PAGES; page++) {
    const payload = await fetchJson(fetchImpl, soopLiveSearchUrl(keyword, page));
    const batch = payload ? parseSoopSearchLives(payload) : [];
    if (batch.length === 0) break;
    for (const live of batch) {
      if (seen.has(live.channelId)) continue;
      seen.add(live.channelId);
      rows.push(live);
    }
    const lastViewers = batch[batch.length - 1]?.viewerCount ?? 0;
    if (lastViewers < DISCOVER_MIN_VIEWERS) break;
    if (soopListEnded(payload)) break;
  }
  return rows.sort(byViewers);
}

export async function ensureDiscoveredCreator(live: DiscoveredLive): Promise<string> {
  const id = discoveredCreatorId(live.platform, live.channelId);
  const existingChannel = await prisma.creatorChannel.findUnique({
    where: { platform_channelId: { platform: live.platform, channelId: live.channelId } },
  });
  if (existingChannel) return existingChannel.creatorId;

  await prisma.creator.upsert({
    where: { id },
    create: { id, name: live.name, kind: "streamer", ingestEnabled: true, discovered: true },
    update: { name: live.name, ingestEnabled: true, discovered: true },
  });
  await prisma.creatorChannel.upsert({
    where: { platform_channelId: { platform: live.platform, channelId: live.channelId } },
    create: { creatorId: id, platform: live.platform, channelId: live.channelId, url: live.url },
    update: { url: live.url },
  });
  return id;
}

export async function discoverLiveCostreamers(
  official: OfficialLiveMatch[],
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  if (official.length === 0) return 0;
  const pages = await Promise.all([
    fetchChzzkPopularLives(fetchImpl).catch(() => [] as DiscoveredLive[]),
    ...SEARCH_KEYWORDS.flatMap((keyword) => [
      fetchTwitchSearch(keyword, fetchImpl).catch(() => [] as DiscoveredLive[]),
      fetchSoopSearch(keyword, fetchImpl).catch(() => [] as DiscoveredLive[]),
    ]),
  ]);
  const seen = new Set<string>();
  let added = 0;
  for (const live of pages.flat()) {
    const key = `${live.platform}:${live.channelId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!attachTitleToOfficial(live.title, official)) continue;
    const before = await prisma.creatorChannel.findUnique({
      where: { platform_channelId: { platform: live.platform, channelId: live.channelId } },
    });
    await ensureDiscoveredCreator(live);
    if (!before) added += 1;
  }
  return added;
}
