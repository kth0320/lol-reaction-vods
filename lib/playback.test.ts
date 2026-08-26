import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPlayback, isPlatform } from "./playback";

describe("getPlayback", () => {
  it("embeds YouTube with the official iframe URL", () => {
    const playback = getPlayback("youtube", "ujj0H0ycY4k", "https://www.youtube.com/watch?v=ujj0H0ycY4k");
    assert.equal(playback.mode, "embed");
    if (playback.mode === "embed") {
      assert.equal(playback.embedUrl, "https://www.youtube.com/embed/ujj0H0ycY4k");
    }
  });

  it("embeds SOOP with the official share player URL", () => {
    const playback = getPlayback("soop", "203559103", "https://vod.sooplive.com/player/203559103");
    assert.equal(playback.mode, "embed");
    if (playback.mode === "embed") {
      assert.equal(playback.embedUrl, "https://vod.sooplive.com/player/203559103/embed");
    }
  });

  it("sends Chzzk to the original link instead of an iframe", () => {
    const playback = getPlayback("chzzk", "14594686", "https://chzzk.naver.com/video/14594686");
    assert.equal(playback.mode, "link-out");
    if (playback.mode === "link-out") {
      assert.equal(playback.originalUrl, "https://chzzk.naver.com/video/14594686");
    }
  });

  it("sends Twitch to the original link instead of an iframe", () => {
    const playback = getPlayback("twitch", "caedrel", "https://www.twitch.tv/caedrel");
    assert.equal(playback.mode, "link-out");
    if (playback.mode === "link-out") {
      assert.equal(playback.platform, "twitch");
      assert.equal(playback.originalUrl, "https://www.twitch.tv/caedrel");
    }
  });

  it("rejects unknown platforms", () => {
    assert.equal(isPlatform("twitch"), true);
    assert.equal(isPlatform("kick"), false);
    assert.equal(isPlatform("youtube"), true);
  });
});
