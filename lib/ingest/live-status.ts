export type LiveProbe = {
  isLive: boolean;
  title: string;
  externalId: string;
  liveUrl: string;
};

const USER_AGENT = "lol-reaction-vods-prototype/0.1";
const TWITCH_GQL_CLIENT_ID = process.env.TWITCH_GQL_CLIENT_ID ?? "kimne78kx3ncx6brgo4mv6wki5h1ko";

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseChzzkLiveStatus(payload: unknown, channelId: string, url: string): LiveProbe {
  const content = asRecord(asRecord(payload)?.content);
  const isLive = text(content?.status).toUpperCase() === "OPEN";
  return {
    isLive,
    title: text(content?.liveTitle),
    externalId: channelId,
    liveUrl: isLive ? `https://chzzk.naver.com/live/${channelId}` : url,
  };
}

export function parseSoopLive(payload: unknown, channelId: string, url: string): LiveProbe {
  const channel = asRecord(asRecord(payload)?.CHANNEL);
  const isLive = Number(channel?.RESULT) === 1;
  return {
    isLive,
    title: text(channel?.TITLE) || text(channel?.BJNICK),
    externalId: channelId,
    liveUrl: url,
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
  };
}

async function readJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`);
  }
  return JSON.parse(body) as unknown;
}

export async function probeChzzkLive(channelId: string, url: string, fetchImpl: typeof fetch = fetch): Promise<LiveProbe> {
  const response = await fetchImpl(`https://api.chzzk.naver.com/polling/v2/channels/${encodeURIComponent(channelId)}/live-status`, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  return parseChzzkLiveStatus(await readJson(response), channelId, url);
}

export async function probeSoopLive(channelId: string, url: string, fetchImpl: typeof fetch = fetch): Promise<LiveProbe> {
  const response = await fetchImpl("https://live.sooplive.com/afreeca/player_live_api.php", {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `bid=${encodeURIComponent(channelId)}&type=json`,
    cache: "no-store",
  });
  return parseSoopLive(await readJson(response), channelId, url);
}

export async function probeTwitchLive(login: string, url: string, fetchImpl: typeof fetch = fetch): Promise<LiveProbe> {
  const response = await fetchImpl("https://gql.twitch.tv/gql", {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Client-ID": TWITCH_GQL_CLIENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: "query($login:String!){ user(login:$login){ login stream { title type } } }",
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
