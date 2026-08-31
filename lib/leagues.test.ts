import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIVE_CAROUSEL_INTERVAL_MS,
  isPrototypeLiveLeague,
  leagueFromSlug,
  pickNextMatchByLeague,
  sortLiveMatchesByLeague,
} from "./leagues";

describe("sortLiveMatchesByLeague", () => {
  it("orders live matches LCK then LPL then LEC and skips missing leagues", () => {
    const ordered = sortLiveMatchesByLeague([
      { id: "lec", tournament: "LEC" },
      { id: "lck", tournament: "LCK" },
    ]);
    assert.deepEqual(
      ordered.map((match) => match.id),
      ["lck", "lec"],
    );
  });

  it("treats LCK, LPL, and LEC as live leagues", () => {
    assert.equal(isPrototypeLiveLeague("LCK"), true);
    assert.equal(isPrototypeLiveLeague("LEC"), true);
    assert.equal(isPrototypeLiveLeague("LPL"), true);
    assert.equal(isPrototypeLiveLeague("Worlds"), false);
  });

  it("uses a 5 second carousel interval", () => {
    assert.equal(LIVE_CAROUSEL_INTERVAL_MS, 5000);
  });

  it("maps lolesports slugs onto league codes", () => {
    assert.equal(leagueFromSlug("lck"), "LCK");
    assert.equal(leagueFromSlug("lec"), "LEC");
    assert.equal(leagueFromSlug("worlds"), null);
  });
});

describe("pickNextMatchByLeague", () => {
  it("keeps the earliest upcoming match per LCK LPL LEC", () => {
    const next = pickNextMatchByLeague([
      { id: "lec-late", tournament: "LEC", startsAt: new Date("2026-09-02T16:00:00Z") },
      { id: "lck", tournament: "LCK", startsAt: new Date("2026-09-01T10:00:00Z") },
      { id: "lec-soon", tournament: "LEC", startsAt: new Date("2026-09-01T16:00:00Z") },
    ]);
    assert.equal(next.LCK?.id, "lck");
    assert.equal(next.LPL, null);
    assert.equal(next.LEC?.id, "lec-soon");
  });
});
