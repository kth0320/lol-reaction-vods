import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPlayback, isPlatform } from "./playback";

describe("getPlayback", () => {
  it("sends YouTube to the original watch page", () => {
    const playback = getPlayback("youtube", "ujj0H0ycY4k", "https://www.youtube.com/watch?v=ujj0H0ycY4k");
    assert.equal(playback.mode, "link-out");
    assert.equal(playback.label, "YouTube");
    assert.equal(playback.originalUrl, "https://www.youtube.com/watch?v=ujj0H0ycY4k");
  });

  it("sends SOOP VODs to the original player page", () => {
    const playback = getPlayback("soop", "203559103", "https://vod.sooplive.com/player/203559103");
    assert.equal(playback.mode, "link-out");
    assert.equal(playback.label, "숲");
    assert.equal(playback.originalUrl, "https://vod.sooplive.com/player/203559103");
  });

  it("sends SOOP live to the original channel", () => {
    const playback = getPlayback("soop", "ksh0162", "https://play.sooplive.com/ksh0162", { live: true });
    assert.equal(playback.mode, "link-out");
    assert.equal(playback.originalUrl, "https://play.sooplive.com/ksh0162");
  });

  it("sends Chzzk VODs to the official watch page", () => {
    const playback = getPlayback("chzzk", "14594686", "https://chzzk.naver.com/video/14594686");
    assert.equal(playback.mode, "link-out");
    assert.equal(playback.label, "치지직");
    assert.equal(playback.originalUrl, "https://chzzk.naver.com/video/14594686");
  });

  it("sends Chzzk live to the official live page", () => {
    const playback = getPlayback(
      "chzzk",
      "0b33823ac81de48d5b78a38cdbc0ab94",
      "https://chzzk.naver.com/live/0b33823ac81de48d5b78a38cdbc0ab94",
      { live: true },
    );
    assert.equal(playback.mode, "link-out");
    assert.equal(playback.originalUrl, "https://chzzk.naver.com/live/0b33823ac81de48d5b78a38cdbc0ab94");
  });

  it("sends Twitch live to the original channel page", () => {
    const playback = getPlayback("twitch", "caedrel", "https://www.twitch.tv/caedrel", {
      live: true,
      parentHost: "127.0.0.1",
    });
    assert.equal(playback.mode, "link-out");
    assert.equal(playback.platform, "twitch");
    assert.equal(playback.originalUrl, "https://www.twitch.tv/caedrel");
  });

  it("rejects unknown platforms", () => {
    assert.equal(isPlatform("twitch"), true);
    assert.equal(isPlatform("kick"), false);
    assert.equal(isPlatform("youtube"), true);
  });
});
