import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVodUrl } from "./vod-url";

describe("parseVodUrl", () => {
  it("reads YouTube watch, short, and embed links", () => {
    assert.deepEqual(parseVodUrl("https://www.youtube.com/watch?v=ujj0H0ycY4k"), {
      platform: "youtube",
      externalId: "ujj0H0ycY4k",
      canonicalUrl: "https://www.youtube.com/watch?v=ujj0H0ycY4k",
    });
    assert.equal(parseVodUrl("https://youtu.be/ujj0H0ycY4k")?.externalId, "ujj0H0ycY4k");
    assert.equal(parseVodUrl("https://www.youtube.com/embed/ujj0H0ycY4k")?.externalId, "ujj0H0ycY4k");
  });

  it("reads Chzzk and SOOP replay links", () => {
    assert.deepEqual(parseVodUrl("https://chzzk.naver.com/video/14594686"), {
      platform: "chzzk",
      externalId: "14594686",
      canonicalUrl: "https://chzzk.naver.com/video/14594686",
    });
    assert.deepEqual(parseVodUrl("https://vod.sooplive.com/player/203559103/embed"), {
      platform: "soop",
      externalId: "203559103",
      canonicalUrl: "https://vod.sooplive.com/player/203559103",
    });
  });

  it("rejects Twitch and junk", () => {
    assert.equal(parseVodUrl("https://www.twitch.tv/videos/123"), null);
    assert.equal(parseVodUrl("not a url"), null);
    assert.equal(parseVodUrl("https://chzzk.naver.com/untara"), null);
  });
});
