import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupReactionsForWatch, pickWatchReactions } from "./watch-links";

describe("pickWatchReactions", () => {
  it("keeps the Chzzk VOD when YouTube is not up yet", () => {
    const picked = pickWatchReactions([
      {
        platform: "chzzk",
        publishedAt: new Date("2026-08-08T12:00:00Z"),
        url: "https://chzzk.naver.com/video/14594686",
      },
    ]);
    assert.deepEqual(
      picked.map((row) => row.platform),
      ["chzzk"],
    );
  });

  it("adds the YouTube video next to the Chzzk replay once it is attached", () => {
    const picked = pickWatchReactions([
      {
        platform: "chzzk",
        publishedAt: new Date("2026-08-08T12:00:00Z"),
        url: "https://chzzk.naver.com/video/14594686",
      },
      {
        platform: "youtube",
        publishedAt: new Date("2026-08-08T14:00:00Z"),
        url: "https://www.youtube.com/watch?v=RxF_OZTbneM",
      },
    ]);
    assert.deepEqual(
      picked.map((row) => row.url),
      ["https://chzzk.naver.com/video/14594686", "https://www.youtube.com/watch?v=RxF_OZTbneM"],
    );
  });
});

describe("groupReactionsForWatch", () => {
  it("shows Wolf's Chzzk replay when YouTube is not up yet", () => {
    const cards = groupReactionsForWatch([
      {
        id: "r1",
        creatorId: "wolf",
        creatorName: "울프",
        creatorKind: "streamer",
        platform: "chzzk",
        title: "울챔스 T1 vs HLE",
        url: "https://chzzk.naver.com/video/14594686",
        publishedAt: new Date("2026-07-12T12:00:00Z"),
        imageUrl: "https://img.example/wolf.jpg",
      },
    ]);
    assert.equal(cards.length, 1);
    assert.equal(cards[0].imageUrl, "https://img.example/wolf.jpg");
    assert.deepEqual(cards[0].links, [
      { href: "https://chzzk.naver.com/video/14594686", platform: "chzzk", label: "치지직에서 보기" },
    ]);
  });

  it("keeps the Chzzk replay and adds the YouTube video", () => {
    const cards = groupReactionsForWatch([
      {
        id: "r-chzzk",
        creatorId: "wolf",
        creatorName: "울프",
        creatorKind: "streamer",
        platform: "chzzk",
        title: "울챔스 T1 vs HLE",
        url: "https://chzzk.naver.com/video/14594686",
        publishedAt: new Date("2026-07-12T12:00:00Z"),
      },
      {
        id: "r-yt",
        creatorId: "wolf",
        creatorName: "울프",
        creatorKind: "streamer",
        platform: "youtube",
        title: "으악 오렌지 괴수다! │ T1 vs HLE",
        url: "https://www.youtube.com/watch?v=RxF_OZTbneM",
        publishedAt: new Date("2026-07-12T14:00:00Z"),
      },
    ]);
    assert.equal(cards.length, 1);
    assert.deepEqual(cards[0].links, [
      { href: "https://chzzk.naver.com/video/14594686", platform: "chzzk", label: "치지직에서 보기" },
      { href: "https://www.youtube.com/watch?v=RxF_OZTbneM", platform: "youtube", label: "YouTube에서 보기" },
    ]);
    assert.match(cards[0].links[0].href, /chzzk\.naver\.com\/video\//);
    assert.match(cards[0].links[1].href, /youtube\.com\/watch\?v=/);
  });

  it("keeps a single SOOP VOD as one outbound video link", () => {
    const cards = groupReactionsForWatch([
      {
        id: "r2",
        creatorId: "minkyo",
        creatorName: "김민교",
        creatorKind: "bj",
        platform: "soop",
        title: "김민교 LCK T1 vs DK",
        url: "https://vod.sooplive.com/player/203559103",
        publishedAt: new Date("2026-08-06T11:00:00Z"),
      },
    ]);
    assert.equal(cards.length, 1);
    assert.deepEqual(cards[0].links, [
      { href: "https://vod.sooplive.com/player/203559103", platform: "soop", label: "숲에서 보기" },
    ]);
  });
});
