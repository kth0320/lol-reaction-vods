import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseChzzkChannel, parseChzzkLiveStatus, parseSoopLive, parseSoopStation, parseTwitchGql, probeSoopLive, soopProfileImageUrl } from "./live-status";

describe("live status parsers", () => {
  it("treats Chzzk OPEN as live and CLOSE as off", () => {
    const live = parseChzzkLiveStatus(
      { content: { status: "OPEN", liveTitle: "울챔스 / KT vs BRO", concurrentUserCount: 1200 } },
      "wolf",
      "https://chzzk.naver.com/wolf",
      "https://img.example/wolf.jpg",
    );
    assert.equal(live.isLive, true);
    assert.equal(live.title, "울챔스 / KT vs BRO");
    assert.equal(live.viewerCount, 1200);
    assert.equal(live.imageUrl, "https://img.example/wolf.jpg");
    const off = parseChzzkLiveStatus({ content: { status: "CLOSE", liveTitle: "지난 방송" } }, "wadid", "https://chzzk.naver.com/wadid");
    assert.equal(off.isLive, false);
    assert.equal(off.viewerCount, null);
  });

  it("reads Chzzk channel images", () => {
    assert.equal(
      parseChzzkChannel({ content: { channelImageUrl: "https://nng-phinf.pstatic.net/wolf.jpg" } }),
      "https://nng-phinf.pstatic.net/wolf.jpg",
    );
  });

  it("treats SOOP RESULT 1 as live and builds the profile logo URL", () => {
    const live = parseSoopLive(
      { CHANNEL: { RESULT: 1, TITLE: "[LCK P.O] KT vs 브리온", BJNICK: "BJ훈수킹", WC: 0 } },
      "ehdrb866",
      "https://play.sooplive.com/ehdrb866",
    );
    assert.equal(live.isLive, true);
    assert.equal(live.imageUrl, soopProfileImageUrl("ehdrb866"));
    assert.equal(live.imageUrl, "https://profile.img.sooplive.co.kr/LOGO/eh/ehdrb866/ehdrb866.jpg");
    const off = parseSoopLive({ CHANNEL: { RESULT: 0 } }, "nobody", "https://play.sooplive.com/nobody");
    assert.equal(off.isLive, false);
  });

  it("reads SOOP station profile images, viewers, and a live title", () => {
    const station = parseSoopStation({
      profile_image: "//profile.img.sooplive.co.kr/LOGO/eh/ehdrb866/ehdrb866.jpg",
      broad: { current_sum_viewer: 663, broad_title: "[LCK] T1 vs 한화" },
    });
    assert.equal(station.imageUrl, "https://profile.img.sooplive.co.kr/LOGO/eh/ehdrb866/ehdrb866.jpg");
    assert.equal(station.viewerCount, 663);
    assert.equal(station.isLive, true);
    assert.equal(station.title, "[LCK] T1 vs 한화");
    assert.equal(parseSoopStation({ profile_image: "" }).isLive, false);
  });

  it("treats Twitch stream type live as live", () => {
    const live = parseTwitchGql(
      {
        data: {
          user: {
            profileImageURL: "https://static-cdn.jtvnw.net/caedrel.png",
            stream: { title: "LCK PLAYOFFS", type: "live", viewersCount: 60000 },
          },
        },
      },
      "caedrel",
      "https://www.twitch.tv/caedrel",
    );
    assert.equal(live.isLive, true);
    assert.equal(live.viewerCount, 60000);
    assert.equal(live.imageUrl, "https://static-cdn.jtvnw.net/caedrel.png");
    const off = parseTwitchGql({ data: { user: { stream: null } } }, "ibai", "https://www.twitch.tv/ibai");
    assert.equal(off.isLive, false);
  });

  it("keeps a SOOP live when the station request fails", async () => {
    const live = await probeSoopLive("ehdrb866", "https://play.sooplive.com/ehdrb866", async (input) => {
      const url = String(input);
      if (url.includes("player_live_api")) {
        return new Response(JSON.stringify({ CHANNEL: { RESULT: 1, TITLE: "[LCK] T1 vs 한화" } }), { status: 200 });
      }
      return new Response("timeout", { status: 504 });
    });
    assert.equal(live.isLive, true);
    assert.equal(live.title, "[LCK] T1 vs 한화");
  });

  it("keeps a SOOP live from the station when player_live_api fails", async () => {
    const live = await probeSoopLive("phonics1", "https://play.sooplive.com/phonics1", async (input) => {
      const url = String(input);
      if (url.includes("/station")) {
        return new Response(
          JSON.stringify({
            profile_image: "//profile.img.sooplive.co.kr/LOGO/ph/phonics1/phonics1.jpg",
            broad: { broad_title: "김민교 LCK T1 vs HLE", current_sum_viewer: 1200 },
          }),
          { status: 200 },
        );
      }
      return new Response("blocked", { status: 403 });
    });
    assert.equal(live.isLive, true);
    assert.equal(live.title, "김민교 LCK T1 vs HLE");
    assert.equal(live.viewerCount, 1200);
  });
});
