import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LIVE_CAROUSEL_INTERVAL_MS, isPrototypeLiveLeague, sortLiveMatchesByLeague } from "./leagues";

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

  it("treats only LCK and LEC as prototype live leagues", () => {
    assert.equal(isPrototypeLiveLeague("LCK"), true);
    assert.equal(isPrototypeLiveLeague("LEC"), true);
    assert.equal(isPrototypeLiveLeague("LPL"), false);
  });

  it("uses a 5 second carousel interval", () => {
    assert.equal(LIVE_CAROUSEL_INTERVAL_MS, 5000);
  });
});
