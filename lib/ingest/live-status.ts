export type LiveProbe = {
  isLive: boolean;
  title: string;
  externalId: string;
  liveUrl: string;
  viewerCount: number | null;
  imageUrl: string;
};

const USER_AGENT = "Mozilla/5.0 (compatible; lol-reaction-vods-prototype/0.1)";
const TWITCH_GQL_CLIENT_ID = process.env.TWITCH_GQL_CLIENT_ID ?? "kimne78kx3ncx6brgo4mv6wki5h1ko";

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function count(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.floor(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

export function soopProfileImageUrl(channelId: string): string {
  const prefix = channelId.slice(0, 2).toLowerCase();
  return `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${channelId}/${channelId}.jpg`;
}

export function absoluteHttpUrl(value: string): string {
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

export function parseChzzkLiveStatus(payload: unknown, channelId: string, url: string, imageUrl = ""): LiveProbe {
  const content = asRecord(asRecord(payload)?.content);
  const isLive = text(content?.status).toUpperCase() === "OPEN";
  return {
    isLive,
    title: text(content?.liveTitle),
    externalId: channelId,
    liveUrl: isLive ? `https://chzzk.naver.com/live/${channelId}` : url,
    viewerCount: isLive ? count(content?.concurrentUserCount) : null,
    imageUrl: absoluteHttpUrl(imageUrl),
  };
}

export function parseChzzkChannel(payload: unknown): string {
  return absoluteHttpUrl(text(asRecord(asRecord(payload)?.content)?.channelImageUrl));
}

export function parseSoopLive(payload: unknown, channelId: string, url: string): LiveProbe {
  const channel = asRecord(asRecord(payload)?.CHANNEL);
  const isLive = Number(channel?.RESULT) === 1;
  return {
    isLive,
    title: text(channel?.TITLE) || text(channel?.BJNICK),
    externalId: channelId,
    liveUrl: url,
    viewerCount: isLive ? count(channel?.WC) || null : null,
    imageUrl: soopProfileImageUrl(channelId),
  };
}

export function parseSoopStation(payload: unknown): { imageUrl: string; viewerCount: number | null } {
  const root = asRecord(payload);
  const broad = asRecord(root?.broad);
  return {
    imageUrl: absoluteHttpUrl(text(root?.profile_image)),
    viewerCount: count(broad?.current_sum_viewer),
  };
}

export function parseTwitchGql(payload: unknown, login: string, url: string): LiveProbe {
  const user = asRecord(asRecord(asRecord(payload)?.data)?.user);
  const stream = asRecord(user?.stream);
  const isLive = Boolean(stream && text(stream.type) === "live");
  return {
    isLive,
    title: text(stream?.title),
    externalId: login,
    liveUrl: url,
    viewerCount: isLive ? count(stream?.viewersCount) : null,
    imageUrl: absoluteHttpUrl(text(user?.profileImageURL)),
  };
}

const FETCH_TIMEOUT_MS = 4000;

async function readJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`);
  }
  return JSON.parse(body) as unknown;
}

async function fetchOk(fetchImpl: typeof fetch, url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function probeChzzkLive(channelId: string, url: string, fetchImpl: typeof fetch = fetch): Promise<LiveProbe> {
  const headers = { "User-Agent": USER_AGENT };
  const [statusRes, channelRes] = await Promise.all([
    fetchOk(fetchImpl, `https://api.chzzk.naver.com/polling/v2/channels/${encodeURIComponent(channelId)}/live-status`, {
      headers,
      cache: "no-store",
    }),
    fetchOk(fetchImpl, `https://api.chzzk.naver.com/service/v1/channels/${encodeURIComponent(channelId)}`, {
      headers,
      cache: "no-store",
    }),
  ]);
  const imageUrl = parseChzzkChannel(await readJson(channelRes));
  return parseChzzkLiveStatus(await readJson(statusRes), channelId, url, imageUrl);
}

export async function probeSoopLive(channelId: string, url: string, fetchImpl: typeof fetch = fetch): Promise<LiveProbe> {
  const headers = { "User-Agent": USER_AGENT };
  const [liveRes, stationRes] = await Promise.all([
    fetchOk(fetchImpl, "https://live.sooplive.com/afreeca/player_live_api.php", {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `bid=${encodeURIComponent(channelId)}&type=json`,
      cache: "no-store",
    }),
    fetchOk(fetchImpl, `https://chapi.sooplive.co.kr/api/${encodeURIComponent(channelId)}/station`, {
      headers,
      cache: "no-store",
    }),
  ]);
  const live = parseSoopLive(await readJson(liveRes), channelId, url);
  let station = { imageUrl: "", viewerCount: null as number | null };
  try {
    station = parseSoopStation(await readJson(stationRes));
  } catch {
    // keep player_live_api fields; WC is often 0
  }
  return {
    ...live,
    viewerCount: live.isLive ? (station.viewerCount ?? live.viewerCount) : null,
    imageUrl: station.imageUrl || live.imageUrl,
  };
}

export async function probeTwitchLive(login: string, url: string, fetchImpl: typeof fetch = fetch): Promise<LiveProbe> {
  const response = await fetchOk(fetchImpl, "https://gql.twitch.tv/gql", {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Client-ID": TWITCH_GQL_CLIENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query:
        "query($login:String!){ user(login:$login){ login profileImageURL(width:150) stream { title type viewersCount } } }",
      variables: { login },
    }),
    cache: "no-store",
  });
  return parseTwitchGql(await readJson(response), login, url);
}

export async function probeLive(platform: string, channelId: string, url: string, fetchImpl: typeof fetch = fetch): Promise<LiveProbe> {
  if (platform === "chzzk") return probeChzzkLive(channelId, url, fetchImpl);
  if (platform === "soop") return probeSoopLive(channelId, url, fetchImpl);
  if (platform === "twitch") return probeTwitchLive(channelId, url, fetchImpl);
  throw new Error(`unsupported platform ${platform}`);
}
