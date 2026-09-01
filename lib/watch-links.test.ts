import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupReactionsForWatch, usesChannelPair } from "./watch-links";

const wolfChannels = [
  { platform: "chzzk", url: "https://chzzk.naver.com/wolf" },
  { platform: "youtube", url: "https://www.youtube.com/@WolfYoutube_Official" },
];

describe("usesChannelPair", () => {
  it("pairs station + YouTube when a recap channel exists", () => {
    assert.equal(usesChannelPair(1, wolfChannels), true);
    assert.equal(usesChannelPair(2, wolfChannels), true);
  });

  it("does not pair a station-only creator", () => {
    assert.equal(usesChannelPair(0, [{ platform: "soop", url: "https://play.sooplive.com/phonics1" }]), false);
    assert.equal(
      usesChannelPair(1, [{ platform: "youtube", url: "https://www.youtube.com/@solo" }]),
      false,
    );
  });

  it("pairs two YouTube recaps even without a station", () => {
    assert.equal(usesChannelPair(2, [{ platform: "youtube", url: "https://www.youtube.com/@solo" }]), true);
  });
});

describe("groupReactionsForWatch", () => {
  it("gives Wolf a 치지직 station link and a YouTube channel link", () => {
    const cards = groupReactionsForWatch([
      {
        id: "r1",
        creatorId: "wolf",
        creatorName: "울프",
        creatorKind: "streamer",
        platform: "youtube",
        title: "GEN vs T1 하이라이트 1",
        url: "https://www.youtube.com/watch?v=aaaa",
        publishedAt: new Date("2026-07-12T12:00:00Z"),
        channels: wolfChannels,
      },
    ]);
    assert.equal(cards.length, 1);
    assert.deepEqual(
      cards[0].links.map((link) => link.label),
      ["치지직 방송국", "YouTube 채널"],
    );
    assert.equal(cards[0].links[0].href, "https://chzzk.naver.com/wolf");
    assert.equal(cards[0].links[1].href, "https://www.youtube.com/@WolfYoutube_Official");
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
        channels: [{ platform: "soop", url: "https://play.sooplive.com/phonics1" }],
      },
    ]);
    assert.equal(cards.length, 1);
    assert.deepEqual(cards[0].links, [{ href: "https://vod.sooplive.com/player/203559103", label: "숲에서 보기" }]);
    assert.equal(cards[0].title, "김민교 LCK T1 vs DK");
  });

  it("collapses two YouTube recaps for one creator into channel links", () => {
    const cards = groupReactionsForWatch([
      {
        id: "g1",
        creatorId: "gangmam",
        creatorName: "갱맘",
        creatorKind: "youtuber",
        platform: "youtube",
        title: "LCK 1세트",
        url: "https://www.youtube.com/watch?v=one",
        publishedAt: new Date("2026-08-01T10:00:00Z"),
        channels: [
          { platform: "chzzk", url: "https://chzzk.naver.com/gangmam" },
          { platform: "youtube", url: "https://www.youtube.com/@gangmam" },
        ],
      },
      {
        id: "g2",
        creatorId: "gangmam",
        creatorName: "갱맘",
        creatorKind: "youtuber",
        platform: "youtube",
        title: "LCK 2세트",
        url: "https://www.youtube.com/watch?v=two",
        publishedAt: new Date("2026-08-01T11:00:00Z"),
        channels: [
          { platform: "chzzk", url: "https://chzzk.naver.com/gangmam" },
          { platform: "youtube", url: "https://www.youtube.com/@gangmam" },
        ],
      },
    ]);
    assert.equal(cards.length, 1);
    assert.equal(cards[0].links.length, 2);
    assert.equal(cards[0].links[0].label, "치지직 방송국");
    assert.equal(cards[0].links[1].label, "YouTube 채널");
  });
});
