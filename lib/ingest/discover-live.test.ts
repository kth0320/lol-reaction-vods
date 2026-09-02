import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { discoveredCreatorId, parseChzzkSearchLives, parseSoopSearchLives, parseTwitchSearchChannels } from "./discover-live";

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
});
