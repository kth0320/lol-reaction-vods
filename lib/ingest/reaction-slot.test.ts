import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collapseReactionsBySlot, pickPreferredReaction } from "./reaction-slot";

const vitGx = {
  startsAt: new Date("2026-04-19T15:00:00Z"),
  blueAliases: ["VIT", "Vitality"],
  redAliases: ["GX", "GIANTX"],
};

const t1dk = {
  startsAt: new Date("2024-09-12T08:00:00Z"),
  blueAliases: ["T1"],
  redAliases: ["DK", "Dplus"],
};

describe("pickPreferredReaction", () => {
  it("keeps the real costream over a same-day waiting room", () => {
    const waiting = {
      title: "[ VIT vs GX ] LEC 대기방 | 시참 증바람 내전",
      publishedAt: new Date("2026-04-19T14:54:19Z"),
      externalId: "wait",
    };
    const real = {
      title: "[ VIT vs GX ] 누렁누렁 | 프로 코치 LEC 예측 및 분석#LECCostream",
      publishedAt: new Date("2026-04-19T16:40:06Z"),
      externalId: "real",
    };
    assert.equal(pickPreferredReaction([waiting, real], vitGx).externalId, "real");
    assert.equal(pickPreferredReaction([real, waiting], vitGx).externalId, "real");
  });

  it("keeps one VOD when the streamer went live twice with the same title", () => {
    const first = {
      title: "김민교 LCK T1 vs DK #LckWatchParty",
      publishedAt: new Date("2026-08-06T10:04:13Z"),
      externalId: "1",
    };
    const second = {
      title: "김민교 LCK T1 vs DK #LckWatchParty",
      publishedAt: new Date("2026-08-06T12:04:11Z"),
      externalId: "2",
    };
    assert.equal(
      pickPreferredReaction([first, second], { ...t1dk, startsAt: new Date("2026-08-06T10:00:00Z") }).externalId,
      "2",
    );
  });

  it("prefers the title that is actually this match, not the next-day series", () => {
    const thisMatch = {
      title: "[LCK 선발전] T1 vs DK 이기면 롤드컵 3시드로 진출 #LCKwatchparty",
      publishedAt: new Date("2024-09-12T13:03:21Z"),
      externalId: "t1dk",
    };
    const nextDay = {
      title: "[LCK 선발전] KT vs 폭스 이기면 T1이랑 최종전하러간다 #LCKwatchparty",
      publishedAt: new Date("2024-09-13T10:40:26Z"),
      externalId: "ktfox",
    };
    assert.equal(pickPreferredReaction([thisMatch, nextDay], t1dk).externalId, "t1dk");
  });

  it("drops 생각정리 pre-game when the actual watchparty exists", () => {
    const prep = {
      title: "김민교 LCK GEN vs HLE 전 생각정리 #LckWatchParty",
      publishedAt: new Date("2026-08-13T10:49:05Z"),
      externalId: "prep",
    };
    const real = {
      title: "김민교 LCK GEN vs HLE #LckWatchParty",
      publishedAt: new Date("2026-08-13T12:56:00Z"),
      externalId: "real",
    };
    assert.equal(
      pickPreferredReaction([prep, real], {
        startsAt: new Date("2026-08-13T10:00:00Z"),
        blueAliases: ["GEN", "Gen.G"],
        redAliases: ["HLE", "한화"],
      }).externalId,
      "real",
    );
  });
});

describe("collapseReactionsBySlot", () => {
  it("keeps one card per creator and platform on a match", () => {
    const rows = [
      {
        matchId: "m1",
        creatorId: "longdari",
        platform: "soop",
        title: "[ VIT vs GX ] LEC 대기방 | 시참 증바람 내전",
        publishedAt: new Date("2026-04-19T14:54:19Z"),
        externalId: "wait",
      },
      {
        matchId: "m1",
        creatorId: "longdari",
        platform: "soop",
        title: "[ VIT vs GX ] 누렁누렁 | 프로 코치 LEC 예측 및 분석#LECCostream",
        publishedAt: new Date("2026-04-19T16:40:06Z"),
        externalId: "real",
      },
      {
        matchId: "m1",
        creatorId: "wadid",
        platform: "chzzk",
        title: "VIT vs GX",
        publishedAt: new Date("2026-04-19T16:00:00Z"),
        externalId: "wadid",
      },
    ];
    const kept = collapseReactionsBySlot(rows, () => vitGx);
    assert.deepEqual(
      kept.map((row) => row.externalId).sort(),
      ["real", "wadid"],
    );
  });
});
