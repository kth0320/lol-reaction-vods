import { shouldFetchVods, type VodIngestPlatform } from "@/lib/ingest/platforms";

export type VodListItem = {
  platform: VodIngestPlatform;
  externalId: string;
  title: string;
  url: string;
  publishedAt: Date | null;
};

const USER_AGENT = "Mozilla/5.0 (compatible; lol-reaction-vods-prototype/0.1)";
const FETCH_TIMEOUT_MS = 8000;

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function parseYouTubeAtom(xml: string): VodListItem[] {
  const entries = xml.split("<entry").slice(1);
  const rows: VodListItem[] = [];
  for (const entry of entries) {
    const videoId = text(entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]);
    const title = decodeXml(text(entry.match(/<title>([^<]+)<\/title>/)?.[1]));
    const published = text(entry.match(/<published>([^<]+)<\/published>/)?.[1]);
    if (!videoId || !title) continue;
    const publishedAt = published ? new Date(published) : null;
    rows.push({
      platform: "youtube",
      externalId: videoId,
      title,
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    });
  }
  return rows;
}

export function parseChzzkVideos(payload: unknown): VodListItem[] {
  const content = asRecord(asRecord(payload)?.content);
  const data = content?.data;
  if (!Array.isArray(data)) return [];
  const rows: VodListItem[] = [];
  for (const item of data) {
    const row = asRecord(item);
    if (text(row?.videoType).toUpperCase() !== "REPLAY") continue;
    const videoNo = row?.videoNo;
    const externalId = typeof videoNo === "number" ? String(videoNo) : text(videoNo);
    const title = text(row?.videoTitle);
    if (!externalId || !title) continue;
    const publishedAtMs = typeof row?.publishDateAt === "number" ? row.publishDateAt : null;
    const publishedAt = publishedAtMs != null ? new Date(publishedAtMs) : parseLooseDate(text(row?.publishDate));
    rows.push({
      platform: "chzzk",
      externalId,
      title,
      url: `https://chzzk.naver.com/video/${encodeURIComponent(externalId)}`,
      publishedAt,
    });
  }
  return rows;
}

export function parseSoopVods(payload: unknown): VodListItem[] {
  const data = asRecord(payload)?.data;
  if (!Array.isArray(data)) return [];
  const rows: VodListItem[] = [];
  for (const item of data) {
    const row = asRecord(item);
    const titleNo = row?.title_no;
    const externalId = typeof titleNo === "number" ? String(titleNo) : text(titleNo);
    const title = text(row?.title_name);
    if (!externalId || !title) continue;
    rows.push({
      platform: "soop",
      externalId,
      title,
      url: `https://vod.sooplive.com/player/${encodeURIComponent(externalId)}`,
      publishedAt: parseLooseDate(text(row?.reg_date), "+09:00"),
    });
  }
  return rows;
}

export function parseLooseDate(value: string, offset = "Z"): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}${offset}`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function readBody(response: Response): Promise<string> {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`);
  }
  return body;
}

async function fetchOk(fetchImpl: typeof fetch, url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchYouTubeUploads(channelId: string, fetchImpl: typeof fetch = fetch): Promise<VodListItem[]> {
  const id = encodeURIComponent(channelId);
  const body = await readBody(
    await fetchOk(fetchImpl, `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`),
  );
  return parseYouTubeAtom(body);
}

export async function fetchChzzkReplays(channelId: string, fetchImpl: typeof fetch = fetch): Promise<VodListItem[]> {
  const id = encodeURIComponent(channelId);
  const body = await readBody(
    await fetchOk(
      fetchImpl,
      `https://api.chzzk.naver.com/service/v1/channels/${id}/videos?sortType=LATEST&pagingType=PAGE&page=0&size=20`,
    ),
  );
  return parseChzzkVideos(JSON.parse(body) as unknown);
}

export async function fetchSoopVods(channelId: string, fetchImpl: typeof fetch = fetch): Promise<VodListItem[]> {
  const id = encodeURIComponent(channelId);
  const body = await readBody(await fetchOk(fetchImpl, `https://chapi.sooplive.co.kr/api/${id}/vods`));
  return parseSoopVods(JSON.parse(body) as unknown);
}

export async function fetchVodsForChannel(
  platform: string,
  channelId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<VodListItem[]> {
  if (!shouldFetchVods(platform)) return [];
  if (platform === "youtube") return fetchYouTubeUploads(channelId, fetchImpl);
  if (platform === "chzzk") return fetchChzzkReplays(channelId, fetchImpl);
  if (platform === "soop") return fetchSoopVods(channelId, fetchImpl);
  return [];
}
