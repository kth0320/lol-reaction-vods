import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chzzkPopularLivesUrl,
  discoveredCreatorId,
  parseChzzkPopularNext,
  parseChzzkSearchLives,
  parseSoopSearchLives,
  parseTwitchSearchChannels,
  soopLiveSearchUrl,
} from "./discover-live";

describe("parseChzzkSearchLives", () => {
  it("keeps a costream search hit and drops LCK CL / official names", () => {
    const rows = parseChzzkSearchLives({
      content: {
        data: [
          {
            live: { liveTitle: "울챔스 / GEN vs T1 #LCKWatchParty", channelId: "abc123" },
            channel: { channelId: "abc123", channelName: "울프" },
          },
          {
            live: { liveTitle: "KT vs KRX | 2026 LCK CL 플레이오프", channelId: "cl1" },
            channel: { channelId: "cl1", channelName: "LCK CL" },
          },
        ],
      },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "울프");
    assert.equal(discoveredCreatorId("chzzk", "abc123"), "disc-chzzk-abc123");
  });

  it("reads LoL category popular lives and sorts by viewers", () => {
    const rows = parseChzzkSearchLives({
      content: {
        liveInfoResponseList: [
          {
            liveTitle: "BFX vs DK | 패자조 1라운드",
            concurrentUserCount: 2,
            channel: { channelId: "small", channelName: "롤생각" },
          },
          {
            liveTitle: "BFX vs DK | 패자조 1라운드",
            concurrentUserCount: 51276,
            channel: { channelId: "official", channelName: "LCK" },
          },
          {
            liveTitle: "딮기 응원방 BFX vs DK #LCKWatchParty",
            concurrentUserCount: 12575,
            channel: { channelId: "handongsuk", channelName: "한동숙" },
          },
          {
            liveTitle: "울챔스 / BFX vs DK #LCKWatchParty",
            concurrentUserCount: 20589,
            channel: { channelId: "wolf", channelName: "울프" },
          },
        ],
      },
    });
    assert.deepEqual(
      rows.map((row) => row.name),
      ["울프", "한동숙", "롤생각"],
    );
    assert.equal(rows[0].viewerCount, 20589);
  });
});

describe("chzzk popular lives", () => {
  it("asks the LoL category v2 list for viewer order", () => {
    assert.match(chzzkPopularLivesUrl(), /service\/v2\/categories\/GAME\/League_of_Legends\/lives/);
    assert.match(chzzkPopularLivesUrl(), /sortType=POPULAR/);
    const next = chzzkPopularLivesUrl({ concurrentUserCount: 342, liveId: "20898678" });
    assert.match(next, /concurrentUserCount=342/);
    assert.match(next, /liveId=20898678/);
  });

  it("reads the next-page cursor", () => {
    assert.deepEqual(
      parseChzzkPopularNext({
        content: { page: { next: { concurrentUserCount: 223, liveId: 20898849 } } },
      }),
      { concurrentUserCount: 223, liveId: "20898849" },
    );
  });
});

describe("parseTwitchSearchChannels", () => {
  it("keeps a live costream and drops official or challengers channels", () => {
    const rows = parseTwitchSearchChannels({
      data: {
        searchFor: {
          channels: {
            items: [
              { login: "caedrel", displayName: "Caedrel", stream: { title: "T1 VS GEN LCK", type: "live" } },
              { login: "lck", displayName: "LCK", stream: { title: "LCK", type: "live" } },
              { login: "haewonismo", displayName: "Haewonismo", stream: { title: "NS vs DNS LCK CL WatchParty", type: "live" } },
              { login: "offlineguy", displayName: "offline", stream: null },
            ],
          },
        },
      },
    });
    assert.deepEqual(
      rows.map((row) => row.channelId),
      ["caedrel"],
    );
  });
});

describe("parseSoopSearchLives", () => {
  it("keeps costream hits and drops the official LCK station", () => {
    const rows = parseSoopSearchLives({
      RESULT: "1",
      REAL_BROAD: [
        {
          user_id: "phonics1",
          user_nick: "김민교.",
          broad_title: "김민교x칸 LCK T1 vs HLE 플레이오프 #LckWatchParty",
        },
        {
          user_id: "aflol",
          user_nick: "LCK_KR",
          broad_title: "[CC] [HLE vs T1] 2026 우리은행 LCK 플레이오프",
        },
        {
          user_id: "lshooooo",
          user_nick: "이상호",
          broad_title: "이상호 T1 vs 한화 플레이오프 #LckWatchparty",
        },
      ],
    });
    assert.deepEqual(
      rows.map((row) => row.channelId),
      ["phonics1", "lshooooo"],
    );
    assert.equal(rows[0].platform, "soop");
    assert.match(rows[0].url, /phonics1/);
  });

  it("sorts by viewer count and uses view_cnt search order", () => {
    const rows = parseSoopSearchLives({
      RESULT: "1",
      REAL_BROAD: [
        {
          user_id: "tiny",
          user_nick: "작은방",
          broad_title: "BFX vs DK #lckwatchparty",
          total_view_cnt: "66",
        },
        {
          user_id: "phonics1",
          user_nick: "김민교.",
          broad_title: "김민교 LCK DK vs BFX #LckWatchParty",
          total_view_cnt: "25672",
        },
      ],
    });
    assert.deepEqual(
      rows.map((row) => row.channelId),
      ["phonics1", "tiny"],
    );
    assert.match(soopLiveSearchUrl("LCK"), /szOrder=view_cnt/);
    assert.match(soopLiveSearchUrl("LCK", 4), /nPageNo=4/);
  });
});
