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

  it("sends SOOP live to the original channel instead of the VOD embed", () => {
    const playback = getPlayback("soop", "ksh0162", "https://play.sooplive.com/ksh0162", { live: true });
    assert.equal(playback.mode, "link-out");
    if (playback.mode === "link-out") {
      assert.equal(playback.originalUrl, "https://play.sooplive.com/ksh0162");
    }
  });

  it("embeds Chzzk VODs with the official watch page", () => {
    const playback = getPlayback("chzzk", "14594686", "https://chzzk.naver.com/video/14594686");
    assert.equal(playback.mode, "embed");
    if (playback.mode === "embed") {
      assert.equal(playback.embedUrl, "https://chzzk.naver.com/video/14594686");
    }
  });

  it("embeds Chzzk live with the official live watch page", () => {
    const playback = getPlayback(
      "chzzk",
      "0b33823ac81de48d5b78a38cdbc0ab94",
      "https://chzzk.naver.com/live/0b33823ac81de48d5b78a38cdbc0ab94",
      { live: true },
    );
    assert.equal(playback.mode, "embed");
    if (playback.mode === "embed") {
      assert.equal(
        playback.embedUrl,
        "https://chzzk.naver.com/live/0b33823ac81de48d5b78a38cdbc0ab94",
      );
    }
  });

  it("embeds Twitch live with the official player and page parent", () => {
    const playback = getPlayback("twitch", "caedrel", "https://www.twitch.tv/caedrel", {
      live: true,
      parentHost: "127.0.0.1",
    });
    assert.equal(playback.mode, "embed");
    if (playback.mode === "embed") {
      assert.equal(playback.platform, "twitch");
      assert.equal(
        playback.embedUrl,
        "https://player.twitch.tv/?channel=caedrel&parent=127.0.0.1&parent=localhost&autoplay=false",
      );
    }
  });

  it("rejects unknown platforms", () => {
    assert.equal(isPlatform("twitch"), true);
    assert.equal(isPlatform("kick"), false);
    assert.equal(isPlatform("youtube"), true);
  });
});
