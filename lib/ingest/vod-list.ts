import { kstYear } from "@/lib/format";
import { shouldFetchVods, type VodIngestPlatform } from "@/lib/ingest/platforms";

export type VodFetchOptions = {
  maxPages?: number;
  untilYear?: number;
};

export const VOD_LIVE_PAGES = 1;
export const VOD_ARCHIVE_MAX_PAGES = 50;

export type VodListItem = {
  platform: VodIngestPlatform;
  externalId: string;
  title: string;
  url: string;
  publishedAt: Date | null;
};

const USER_AGENT = "Mozilla/5.0 (compatible; lol-reaction-vods-prototype/0.1)";
const FETCH_TIMEOUT_MS = 15_000;

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

const YOUTUBE_VIDEO_ID = /^[\w-]{11}$/;
const YOUTUBE_VIDEOS_TAB_PARAMS = "EgZ2aWRlb3PyBgQKAjoA";
const YOUTUBE_RELATIVE_AGE =
  /^(?:(?:streamed|premiered|uploaded|edited)\s+)?(\d+|a|an)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i;
const YOUTUBE_RELATIVE_AGE_KO = /^(\d+)\s*(초|분|시간|일|주|개월|달|년)\s*전$/;

export function youtubeUploadsBrowseId(channelId: string): string {
  if (channelId.startsWith("UC") && channelId.length > 2) return `VL${"UU"}${channelId.slice(2)}`;
  return channelId;
}

export function parseRelativeYoutubeAge(value: string, now = new Date()): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const en = trimmed.match(YOUTUBE_RELATIVE_AGE);
  if (en) {
    const raw = en[1].toLowerCase();
    const amount = raw === "a" || raw === "an" ? 1 : Number(raw);
    return shiftRelativeAge(now, amount, en[2].toLowerCase());
  }
  const ko = trimmed.match(YOUTUBE_RELATIVE_AGE_KO);
  if (!ko) return null;
  const unit =
    ko[2] === "초"
      ? "second"
      : ko[2] === "분"
        ? "minute"
        : ko[2] === "시간"
          ? "hour"
          : ko[2] === "일"
            ? "day"
            : ko[2] === "주"
              ? "week"
              : ko[2] === "년"
                ? "year"
                : "month";
  return shiftRelativeAge(now, Number(ko[1]), unit);
}

function shiftRelativeAge(now: Date, amount: number, unit: string): Date | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  const ms =
    unit.startsWith("second")
      ? amount * 1000
      : unit.startsWith("minute")
        ? amount * 60 * 1000
        : unit.startsWith("hour")
          ? amount * 60 * 60 * 1000
          : unit.startsWith("day")
            ? amount * 24 * 60 * 60 * 1000
            : unit.startsWith("week")
              ? amount * 7 * 24 * 60 * 60 * 1000
              : unit.startsWith("month")
                ? amount * 30 * 24 * 60 * 60 * 1000
                : unit.startsWith("year")
                  ? amount * 365 * 24 * 60 * 60 * 1000
                  : 0;
  if (ms <= 0 && unit !== "second") return null;
  return new Date(now.getTime() - ms);
}

function walkJson(value: unknown, visit: (row: Json) => void): void {
  const row = asRecord(value);
  if (row) {
    visit(row);
    for (const child of Object.values(row)) walkJson(child, visit);
    return;
  }
  if (Array.isArray(value)) {
    for (const child of value) walkJson(child, visit);
  }
}

function youtubeVideoItem(externalId: string, title: string, publishedAt: Date | null): VodListItem | null {
  if (!YOUTUBE_VIDEO_ID.test(externalId) || !title) return null;
  return {
    platform: "youtube",
    externalId,
    title,
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(externalId)}`,
    publishedAt,
  };
}

function lockupAge(lockup: Json, now: Date): Date | null {
  const texts: string[] = [];
  walkJson(lockup, (row) => {
    const content = text(asRecord(row.text)?.content) || text(row.content);
    if (content) texts.push(content);
  });
  for (const value of texts) {
    const parsed = parseRelativeYoutubeAge(value, now);
    if (parsed) return parsed;
  }
  return null;
}

export function parseYouTubeBrowse(payload: unknown, now = new Date()): VodListItem[] {
  const rows: VodListItem[] = [];
  const seen = new Set<string>();
  walkJson(payload, (row) => {
    const lockup = asRecord(row.lockupViewModel);
    if (lockup) {
      const contentType = text(lockup.contentType).toUpperCase();
      if (contentType.includes("SHORT")) return;
      const meta = asRecord(asRecord(lockup.metadata)?.lockupMetadataViewModel);
      const title = text(asRecord(meta?.title)?.content) || text(meta?.title);
      const item = youtubeVideoItem(text(lockup.contentId), title, lockupAge(lockup, now));
      if (item && !seen.has(item.externalId)) {
        seen.add(item.externalId);
        rows.push(item);
      }
      return;
    }
    const renderer = asRecord(row.videoRenderer) || asRecord(row.gridVideoRenderer);
    if (!renderer) return;
    const title =
      text(asRecord(renderer.title)?.simpleText) ||
      text(asRecord((asRecord(renderer.title)?.runs as unknown[] | undefined)?.[0])?.text);
    const published =
      parseRelativeYoutubeAge(text(asRecord(renderer.publishedTimeText)?.simpleText), now) ??
      parseLooseDate(text(asRecord(renderer.publishedTimeText)?.simpleText));
    const item = youtubeVideoItem(text(renderer.videoId), title, published);
    if (item && !seen.has(item.externalId)) {
      seen.add(item.externalId);
      rows.push(item);
    }
  });
  return rows;
}

export function youtubeContinuationToken(payload: unknown): string | null {
  const tokens: string[] = [];
  walkJson(payload, (row) => {
    const item = asRecord(row.continuationItemRenderer);
    if (!item) return;
    walkJson(item, (inner) => {
      const token = text(asRecord(inner.continuationCommand)?.token);
      if (token) tokens.push(token);
    });
  });
  return tokens.at(-1) ?? null;
}

export function chzzkVideoPageRawCount(payload: unknown): number {
  const content = asRecord(asRecord(payload)?.content);
  const data = content?.data;
  return Array.isArray(data) ? data.length : 0;
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

async function fetchOk(fetchImpl: typeof fetch, url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetchImpl(url, {
      ...init,
      headers: { "User-Agent": USER_AGENT, ...(init.headers as Record<string, string> | undefined) },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function pageReachedArchiveFloor(rows: VodListItem[], untilYear?: number): boolean {
  if (untilYear == null || rows.length === 0) return false;
  const dated = rows.filter((row) => row.publishedAt);
  if (dated.length === 0) return false;
  const oldest = dated.reduce(
    (min, row) => ((row.publishedAt as Date).getTime() < min.getTime() ? (row.publishedAt as Date) : min),
    dated[0].publishedAt as Date,
  );
  return kstYear(oldest) < untilYear;
}

const YOUTUBE_INNERTUBE_CONTEXT = {
  client: { clientName: "WEB", clientVersion: "2.20240827.00.00", hl: "en", gl: "US" },
};

async function youtubeBrowse(fetchImpl: typeof fetch, payload: Record<string, unknown>): Promise<unknown> {
  const body = await readBody(
    await fetchOk(fetchImpl, "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: YOUTUBE_INNERTUBE_CONTEXT, ...payload }),
    }),
  );
  return JSON.parse(body) as unknown;
}

async function fetchYouTubeBrowsePages(
  channelId: string,
  fetchImpl: typeof fetch,
  options: VodFetchOptions,
): Promise<VodListItem[]> {
  const maxPages = Math.max(1, options.maxPages ?? VOD_LIVE_PAGES);
  const collected: VodListItem[] = [];
  const seen = new Set<string>();
  const starts: Record<string, unknown>[] = [{ browseId: youtubeUploadsBrowseId(channelId) }];
  if (maxPages > 1) starts.push({ browseId: channelId, params: YOUTUBE_VIDEOS_TAB_PARAMS });

  let pages = 0;
  for (const start of starts) {
    if (pages >= maxPages) break;
    let token: string | null = null;
    let request: Record<string, unknown> | null = start;
    while (request && pages < maxPages) {
      let payload: unknown;
      try {
        payload = await youtubeBrowse(fetchImpl, request);
      } catch {
        break;
      }
      const rows = parseYouTubeBrowse(payload);
      const fresh: VodListItem[] = [];
      for (const row of rows) {
        if (seen.has(row.externalId)) continue;
        seen.add(row.externalId);
        collected.push(row);
        fresh.push(row);
      }
      pages += 1;
      if (pageReachedArchiveFloor(fresh, options.untilYear)) return collected;
      token = youtubeContinuationToken(payload);
      request = token ? { continuation: token } : null;
    }
  }
  return collected;
}

export async function fetchYouTubeUploads(
  channelId: string,
  fetchImpl: typeof fetch = fetch,
  options: VodFetchOptions = {},
): Promise<VodListItem[]> {
  let rss: VodListItem[] = [];
  try {
    const id = encodeURIComponent(channelId);
    const body = await readBody(
      await fetchOk(fetchImpl, `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`),
    );
    rss = parseYouTubeAtom(body);
  } catch {
    rss = [];
  }
  const browse = await fetchYouTubeBrowsePages(channelId, fetchImpl, options);
  const seen = new Set(rss.map((row) => row.externalId));
  return [...rss, ...browse.filter((row) => !seen.has(row.externalId))];
}

export async function fetchChzzkReplays(
  channelId: string,
  fetchImpl: typeof fetch = fetch,
  options: VodFetchOptions = {},
): Promise<VodListItem[]> {
  const id = encodeURIComponent(channelId);
  const maxPages = Math.max(1, options.maxPages ?? VOD_LIVE_PAGES);
  const collected: VodListItem[] = [];
  for (let page = 0; page < maxPages; page += 1) {
    const body = await readBody(
      await fetchOk(
        fetchImpl,
        `https://api.chzzk.naver.com/service/v1/channels/${id}/videos?sortType=LATEST&pagingType=PAGE&page=${page}&size=50`,
      ),
    );
    const payload = JSON.parse(body) as unknown;
    const rows = parseChzzkVideos(payload);
    if (chzzkVideoPageRawCount(payload) === 0) break;
    collected.push(...rows);
    if (pageReachedArchiveFloor(rows, options.untilYear)) break;
  }
  return collected;
}

export async function fetchSoopVods(
  channelId: string,
  fetchImpl: typeof fetch = fetch,
  options: VodFetchOptions = {},
): Promise<VodListItem[]> {
  const id = encodeURIComponent(channelId);
  const maxPages = Math.max(1, options.maxPages ?? VOD_LIVE_PAGES);
  const collected: VodListItem[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    let rows: VodListItem[] = [];
    try {
      const body = await readBody(
        await fetchOk(fetchImpl, `https://chapi.sooplive.co.kr/api/${id}/vods?page=${page}`),
      );
      rows = parseSoopVods(JSON.parse(body) as unknown);
    } catch {
      // Keep paging; one slow/failed page used to drop the whole SOOP channel.
      continue;
    }
    if (rows.length === 0) break;
    collected.push(...rows);
    if (pageReachedArchiveFloor(rows, options.untilYear)) break;
  }
  return collected;
}

export async function fetchVodsForChannel(
  platform: string,
  channelId: string,
  fetchImpl: typeof fetch = fetch,
  options: VodFetchOptions = {},
): Promise<VodListItem[]> {
  if (!shouldFetchVods(platform)) return [];
  if (platform === "youtube") return fetchYouTubeUploads(channelId, fetchImpl, options);
  if (platform === "chzzk") return fetchChzzkReplays(channelId, fetchImpl, options);
  if (platform === "soop") return fetchSoopVods(channelId, fetchImpl, options);
  return [];
}
