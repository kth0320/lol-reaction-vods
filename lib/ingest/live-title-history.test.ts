import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extraTitlesForVod, liveTitleMatchIdsForVod } from "./live-title-history";

describe("extraTitlesForVod", () => {
  it("adds a live title from the same window when the VOD was retitled", () => {
    const titles = extraTitlesForVod({
      currentTitle: "다시보기",
      publishedAt: new Date("2026-08-31T12:00:00Z"),
      rows: [
        { title: "울챔스 / T1 vs GEN #LCKWatchParty", seenAt: new Date("2026-08-31T10:00:00Z"), matchId: "m1" },
        { title: "솔랭", seenAt: new Date("2026-08-20T10:00:00Z"), matchId: null },
      ],
    });
    assert.deepEqual(titles, ["다시보기", "울챔스 / T1 vs GEN #LCKWatchParty"]);
  });

  it("does not reuse old live titles when the VOD has no date", () => {
    const titles = extraTitlesForVod({
      currentTitle: "다시보기",
      publishedAt: null,
      rows: [{ title: "울챔스 / T1 vs GEN", seenAt: new Date("2026-08-20T10:00:00Z"), matchId: "m1" }],
    });
    assert.deepEqual(titles, ["다시보기"]);
  });
});

describe("liveTitleMatchIdsForVod", () => {
  it("keeps the match id recorded while live in the same window", () => {
    const ids = liveTitleMatchIdsForVod({
      publishedAt: new Date("2026-08-31T12:00:00Z"),
      rows: [
        { seenAt: new Date("2026-08-31T10:00:00Z"), matchId: "m1" },
        { seenAt: new Date("2026-08-20T10:00:00Z"), matchId: "old" },
      ],
    });
    assert.deepEqual(ids, ["m1"]);
  });
});
