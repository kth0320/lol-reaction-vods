import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseChzzkVideos, parseSoopVods, parseYouTubeAtom, parseYouTubeBrowse, parseRelativeYoutubeAge, fetchChzzkReplays, fetchSoopVods, fetchVodsForChannel, fetchYouTubeUploads, youtubeUploadsBrowseId } from "./vod-list";
import { shouldFetchVods } from "./platforms";
import { vodInMatchWindow } from "./vod-window";
import { pickMatchForVod } from "./attach-vod";

describe("vod ingest platforms", () => {
  it("never fetches Twitch native VODs", () => {
    assert.equal(shouldFetchVods("twitch"), false);
    assert.equal(shouldFetchVods("youtube"), true);
    assert.equal(shouldFetchVods("chzzk"), true);
    assert.equal(shouldFetchVods("soop"), true);
  });
});

describe("vod list parsers", () => {
  it("reads YouTube Atom uploads", () => {
    const rows = parseYouTubeAtom(`
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
        <title>Caedrel</title>
        <entry>
          <yt:videoId>abc123XYZ-_</yt:videoId>
          <title>THE BATTLE FOR SECOND PLACE - T1 VS HLE - LCK SUMMER 2026</title>
          <published>2026-08-08T12:30:00+00:00</published>
        </entry>
      </feed>
    `);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].platform, "youtube");
    assert.equal(rows[0].externalId, "abc123XYZ-_");
    assert.match(rows[0].url, /abc123XYZ-_/);
  });

  it("reads relative YouTube ages in English and Korean", () => {
    const now = new Date("2026-08-31T12:00:00Z");
    const day = parseRelativeYoutubeAge("1 day ago", now);
    const ko = parseRelativeYoutubeAge("2시간 전", now);
    assert.equal(day?.toISOString(), "2026-08-30T12:00:00.000Z");
    assert.equal(ko?.toISOString(), "2026-08-31T10:00:00.000Z");
    assert.equal(parseRelativeYoutubeAge("343K views", now), null);
  });

  it("reads YouTube lockup browse cards", () => {
    const now = new Date("2026-08-31T12:00:00Z");
    const rows = parseYouTubeBrowse(
      {
        contents: {
          lockupViewModel: {
            contentId: "abcdefghijk",
            contentType: "LOCKUP_CONTENT_TYPE_VIDEO",
            metadata: {
              lockupMetadataViewModel: {
                title: { content: "T1 VS GEN LCK SUMMER 2026" },
                metadata: {
                  contentMetadataViewModel: {
                    metadataRows: [{ metadataParts: [{ text: { content: "1 day ago" } }] }],
                  },
                },
              },
            },
          },
        },
      },
      now,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].externalId, "abcdefghijk");
    assert.equal(rows[0].title, "T1 VS GEN LCK SUMMER 2026");
    assert.equal(rows[0].publishedAt?.toISOString(), "2026-08-30T12:00:00.000Z");
  });

  it("merges RSS dates with paged YouTube browse uploads", async () => {
    assert.equal(youtubeUploadsBrowseId("UCOFiUtKui6-x4T-J7_DgCag"), "VLUUOFiUtKui6-x4T-J7_DgCag");
    const rows = await fetchYouTubeUploads(
      "UCOFiUtKui6-x4T-J7_DgCag",
      async (input) => {
        const url = String(input);
        if (url.includes("feeds/videos.xml")) {
          return new Response(
            `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><yt:videoId>rssVideo12</yt:videoId><title>RSS T1 VS GEN</title><published>2026-08-30T12:00:00Z</published></entry></feed>`,
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            contents: {
              lockupViewModel: {
                contentId: "browseVid1x",
                metadata: {
                  lockupMetadataViewModel: {
                    title: { content: "OLDER HLE VS KT LCK" },
                    metadata: {
                      contentMetadataViewModel: {
                        metadataRows: [{ metadataParts: [{ text: { content: "3 days ago" } }] }],
                      },
                    },
                  },
                },
              },
            },
          }),
          { status: 200 },
        );
      },
      { maxPages: 1 },
    );
    assert.deepEqual(
      rows.map((row) => row.externalId),
      ["rssVideo12", "browseVid1x"],
    );
    assert.equal(rows[0].publishedAt?.toISOString(), "2026-08-30T12:00:00.000Z");
  });

  it("keeps Chzzk REPLAY rows and drops other types", () => {
    const rows = parseChzzkVideos({
      content: {
        data: [
          { videoNo: 11, videoType: "REPLAY", videoTitle: "LCK T1 vs HLE", publishDateAt: 1754640000000 },
          { videoNo: 12, videoType: "CLIP", videoTitle: "clip", publishDateAt: 1754640000000 },
        ],
      },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].platform, "chzzk");
    assert.equal(rows[0].externalId, "11");
    assert.equal(rows[0].url, "https://chzzk.naver.com/video/11");
  });

  it("reads SOOP station VODs", () => {
    const rows = parseSoopVods({
      data: [{ title_no: 203731555, title_name: "김민교 LCK T1 vs HLE", reg_date: "2026-08-08 20:30:00" }],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].platform, "soop");
    assert.equal(rows[0].externalId, "203731555");
    assert.equal(rows[0].url, "https://vod.sooplive.com/player/203731555");
  });

  it("returns nothing when asked to fetch Twitch VODs", async () => {
    const rows = await fetchVodsForChannel("twitch", "caedrel", async () => {
      throw new Error("twitch vod fetch should not run");
    });
    assert.deepEqual(rows, []);
  });

  it("pages Chzzk replays until the archive year floor", async () => {
    const calls: string[] = [];
    const rows = await fetchChzzkReplays(
      "ch1",
      async (url) => {
        calls.push(String(url));
        const page = Number(new URL(String(url)).searchParams.get("page"));
        const payload =
          page === 0
            ? {
                content: {
                  data: [
                    {
                      videoNo: 1,
                      videoType: "REPLAY",
                      videoTitle: "LCK 2025",
                      publishDateAt: Date.parse("2025-08-01T00:00:00+09:00"),
                    },
                  ],
                },
              }
            : {
                content: {
                  data: [
                    {
                      videoNo: 2,
                      videoType: "REPLAY",
                      videoTitle: "LCK 2023",
                      publishDateAt: Date.parse("2023-08-01T00:00:00+09:00"),
                    },
                  ],
                },
              };
        return new Response(JSON.stringify(payload), { status: 200 });
      },
      { maxPages: 5, untilYear: 2024 },
    );
    assert.equal(rows.length, 2);
    assert.equal(calls.length, 2);
    assert.match(calls[0], /page=0/);
    assert.match(calls[1], /page=1/);
  });

  it("keeps paging Chzzk when a page is only clips", async () => {
    const calls: string[] = [];
    const rows = await fetchChzzkReplays(
      "ch1",
      async (url) => {
        calls.push(String(url));
        const page = Number(new URL(String(url)).searchParams.get("page"));
        const payload =
          page === 0
            ? {
                content: {
                  data: [{ videoNo: 1, videoType: "CLIP", videoTitle: "clip", publishDateAt: 1754640000000 }],
                },
              }
            : page === 1
              ? {
                  content: {
                    data: [
                      {
                        videoNo: 2,
                        videoType: "REPLAY",
                        videoTitle: "LEC SK vs G2",
                        publishDateAt: 1754640000000,
                      },
                    ],
                  },
                }
              : { content: { data: [] } };
        return new Response(JSON.stringify(payload), { status: 200 });
      },
      { maxPages: 3 },
    );
    assert.deepEqual(
      rows.map((row) => row.externalId),
      ["2"],
    );
    assert.equal(calls.length, 3);
  });

  it("pages SOOP vods newest-first", async () => {
    const calls: string[] = [];
    const rows = await fetchSoopVods(
      "phonics1",
      async (url) => {
        calls.push(String(url));
        const page = new URL(String(url)).searchParams.get("page");
        const payload =
          page === "1"
            ? { data: [{ title_no: 1, title_name: "김민교 LCK", reg_date: "2026-08-08 20:30:00" }] }
            : { data: [] };
        return new Response(JSON.stringify(payload), { status: 200 });
      },
      { maxPages: 3 },
    );
    assert.equal(rows.length, 1);
    assert.deepEqual(calls, [
      "https://chapi.sooplive.co.kr/api/phonics1/vods?page=1&orderby=reg_date",
      "https://chapi.sooplive.co.kr/api/phonics1/vods?page=2&orderby=reg_date",
    ]);
  });

  it("keeps later SOOP pages when one page fails", async () => {
    const rows = await fetchSoopVods(
      "ehdrb866",
      async (url) => {
        const page = new URL(String(url)).searchParams.get("page");
        if (page === "2") return new Response("timeout", { status: 504 });
        if (page === "1") {
          return new Response(
            JSON.stringify({ data: [{ title_no: 1, title_name: "[LEC] KC vs 쉬프트", reg_date: "2026-08-08 20:30:00" }] }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({ data: [{ title_no: 3, title_name: "[LEC] GX vs VIT", reg_date: "2026-08-01 20:30:00" }] }),
          { status: 200 },
        );
      },
      { maxPages: 3 },
    );
    assert.deepEqual(
      rows.map((row) => row.externalId),
      ["1", "3"],
    );
  });
});

describe("vod match window and attach", () => {
  const t1hle = {
    id: "lck-2026-summer-t1-hle",
    tournament: "LCK",
    status: "ended",
    startsAt: new Date("2026-08-08T17:00:00+09:00"),
    bestOf: 3,
    blueTeamId: "t1",
    redTeamId: "hle",
    blueAliases: ["T1", "티원"],
    redAliases: ["HLE", "한화"],
  };

  it("accepts next-day YouTube edits inside the window", () => {
    assert.equal(vodInMatchWindow(new Date("2026-08-09T10:00:00+09:00"), t1hle.startsAt, 3), true);
    assert.equal(vodInMatchWindow(new Date("2026-08-12T10:00:00+09:00"), t1hle.startsAt, 3), false);
  });

  it("attaches an LCK YouTube title to the official match", () => {
    const hit = pickMatchForVod(
      "THE BATTLE FOR SECOND PLACE - T1 VS HLE - LCK SUMMER 2026",
      new Date("2026-08-08T21:00:00+09:00"),
      [t1hle],
    );
    assert.equal(hit?.id, t1hle.id);
  });

  it("does not attach a title outside the match window", () => {
    const hit = pickMatchForVod("T1 VS HLE LCK", new Date("2026-07-01T12:00:00+09:00"), [t1hle]);
    assert.equal(hit, null);
  });

  it("attaches 훈수킹 and 롱다리코치 SOOP titles to LEC matches", () => {
    const fncTh = {
      id: "lec-fnc-th",
      tournament: "LEC",
      status: "ended",
      startsAt: new Date("2026-08-08T04:00:00Z"),
      bestOf: 1,
      blueTeamId: "fnc",
      redTeamId: "th",
      blueAliases: ["FNC", "Fnatic", "프나틱"],
      redAliases: ["TH", "Heretics", "헤레틱스"],
    };
    const gxVit = {
      id: "lec-gx-vit",
      tournament: "LEC",
      status: "ended",
      startsAt: new Date("2026-08-15T03:00:00+09:00"),
      bestOf: 1,
      blueTeamId: "gx",
      redTeamId: "vit",
      blueAliases: ["GX", "GIANTX"],
      redAliases: ["VIT", "Vitality", "바이탈리티"],
    };
    assert.equal(
      pickMatchForVod(
        "[LEC] 프나틱 vs 헤레틱스 소보로 업셋 라족 vs 하이프 왜이 #LCKWatchparty#LPLCOstream",
        new Date("2026-08-08T05:17:36Z"),
        [fncTh, gxVit],
      )?.id,
      "lec-fnc-th",
    );
    assert.equal(
      pickMatchForVod(
        "[ GX vs VIT ] \"진짜들의 시간\" | 프로 코치 LEC 예측 및 분석#LECCostream",
        new Date("2026-08-15T04:25:07+09:00"),
        [fncTh, gxVit],
      )?.id,
      "lec-gx-vit",
    );
  });

  it("attaches Jankos live and Karmine Corp Replay YouTube titles", () => {
    const g2Gx = {
      id: "lec-g2-gx",
      tournament: "LEC",
      status: "ended",
      startsAt: new Date("2026-08-15T16:00:00Z"),
      bestOf: 1,
      blueTeamId: "g2",
      redTeamId: "gx",
      blueAliases: ["G2"],
      redAliases: ["GX", "GIANTX"],
    };
    const kcSk = {
      id: "lec-kc-sk",
      tournament: "LEC",
      status: "ended",
      startsAt: new Date("2026-08-15T17:00:00Z"),
      bestOf: 1,
      blueTeamId: "kc",
      redTeamId: "sk",
      blueAliases: ["KC", "Karmine", "Karmine Corp"],
      redAliases: ["SK", "SK Gaming"],
    };
    assert.equal(
      pickMatchForVod(
        "G2'S LAST TEST BEFORE PLAYOFFS | G2 VS GX | JANKOS LEC SUMMER 2026",
        new Date("2026-08-15T18:00:00Z"),
        [g2Gx, kcSk],
      )?.id,
      "lec-g2-gx",
    );
    assert.equal(
      pickMatchForVod(
        "LEC 2026 Summer - Karmine Corp vs SK - Day 9",
        new Date("2026-08-15T19:00:00Z"),
        [g2Gx, kcSk],
      )?.id,
      "lec-kc-sk",
    );
  });
});
