import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extraTitlesForVod, liveTitleMatchIdsForVod, liveTitleNearVod } from "./live-title-history";

describe("liveTitleNearVod", () => {
  it("keeps a live title from before the VOD was uploaded", () => {
    assert.equal(
      liveTitleNearVod(new Date("2026-08-31T10:00:00Z"), new Date("2026-08-31T12:00:00Z")),
      true,
    );
  });

  it("keeps a live title from later in the same session", () => {
    assert.equal(
      liveTitleNearVod(new Date("2026-08-31T16:00:00Z"), new Date("2026-08-31T12:00:00Z")),
      true,
    );
  });

  it("drops the next morning stream after yesterday's VOD", () => {
    assert.equal(
      liveTitleNearVod(new Date("2026-09-01T07:15:00Z"), new Date("2026-08-31T14:31:00Z")),
      false,
    );
  });

  it("does not use live titles when the VOD has no date", () => {
    assert.equal(liveTitleNearVod(new Date("2026-09-01T07:15:00Z"), null), false);
  });
});

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

  it("does not reuse live titles when the VOD has no date", () => {
    const titles = extraTitlesForVod({
      currentTitle: "다시보기",
      publishedAt: null,
      rows: [{ title: "울챔스 / GEN vs KT", seenAt: new Date(), matchId: "m1" }],
    });
    assert.deepEqual(titles, ["다시보기"]);
  });

  it("does not copy the next stream's title onto yesterday's VOD", () => {
    const titles = extraTitlesForVod({
      currentTitle: "갑자기 옵치내전이 하고싶네 ㅎ;",
      publishedAt: new Date("2026-08-31T14:31:00Z"),
      rows: [
        { title: "울챔스 / GEN vs KT #LCKWatchParty", seenAt: new Date("2026-09-01T07:15:00Z"), matchId: "lck" },
      ],
    });
    assert.deepEqual(titles, ["갑자기 옵치내전이 하고싶네 ㅎ;"]);
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

  it("does not glue a later live match onto an older VOD", () => {
    const ids = liveTitleMatchIdsForVod({
      publishedAt: new Date("2026-08-31T14:31:00Z"),
      rows: [{ seenAt: new Date("2026-09-01T07:15:00Z"), matchId: "lck-gen-kt" }],
      matches: [{ id: "lck-gen-kt", startsAt: new Date("2026-09-01T08:00:00Z"), bestOf: 5 }],
    });
    assert.deepEqual(ids, []);
  });

  it("still attaches a retitled VOD from the same session in the match window", () => {
    const ids = liveTitleMatchIdsForVod({
      publishedAt: new Date("2026-09-01T07:00:00Z"),
      rows: [{ seenAt: new Date("2026-09-01T07:15:00Z"), matchId: "lck-gen-kt" }],
      matches: [{ id: "lck-gen-kt", startsAt: new Date("2026-09-01T08:00:00Z"), bestOf: 5, status: "ended" }],
    });
    assert.deepEqual(ids, ["lck-gen-kt"]);
  });

  it("does not attach via live title while the official match is still live", () => {
    const ids = liveTitleMatchIdsForVod({
      publishedAt: new Date("2026-09-01T07:00:00Z"),
      rows: [{ seenAt: new Date("2026-09-01T07:15:00Z"), matchId: "lck-gen-kt" }],
      matches: [{ id: "lck-gen-kt", startsAt: new Date("2026-09-01T08:00:00Z"), bestOf: 5, status: "live" }],
    });
    assert.deepEqual(ids, []);
  });
});
