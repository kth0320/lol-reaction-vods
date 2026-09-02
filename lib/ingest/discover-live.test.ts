import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { discoveredCreatorId, parseChzzkSearchLives, parseTwitchSearchChannels } from "./discover-live";

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
