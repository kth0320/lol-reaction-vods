import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseChzzkLiveStatus, parseSoopLive, parseTwitchGql } from "./live-status";

describe("live status parsers", () => {
  it("treats Chzzk OPEN as live and CLOSE as off", () => {
    const live = parseChzzkLiveStatus(
      { content: { status: "OPEN", liveTitle: "울챔스 / KT vs BRO" } },
      "wolf",
      "https://chzzk.naver.com/wolf",
    );
    assert.equal(live.isLive, true);
    assert.equal(live.title, "울챔스 / KT vs BRO");
    const off = parseChzzkLiveStatus({ content: { status: "CLOSE", liveTitle: "지난 방송" } }, "wadid", "https://chzzk.naver.com/wadid");
    assert.equal(off.isLive, false);
  });

  it("treats SOOP RESULT 1 as live", () => {
    const live = parseSoopLive(
      { CHANNEL: { RESULT: 1, TITLE: "[LCK P.O] KT vs 브리온", BJNICK: "BJ훈수킹" } },
      "ehdrb866",
      "https://play.sooplive.com/ehdrb866",
    );
    assert.equal(live.isLive, true);
    const off = parseSoopLive({ CHANNEL: { RESULT: 0 } }, "nobody", "https://play.sooplive.com/nobody");
    assert.equal(off.isLive, false);
  });

  it("treats Twitch stream type live as live", () => {
    const live = parseTwitchGql(
      { data: { user: { stream: { title: "LCK PLAYOFFS", type: "live" } } } },
      "caedrel",
      "https://www.twitch.tv/caedrel",
    );
    assert.equal(live.isLive, true);
    const off = parseTwitchGql({ data: { user: { stream: null } } }, "ibai", "https://www.twitch.tv/ibai");
    assert.equal(off.isLive, false);
  });
});
