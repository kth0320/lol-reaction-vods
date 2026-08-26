import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLivePollFresh, LIVE_POLL_FRESH_MS } from "./poll-fresh";

describe("isLivePollFresh", () => {
  it("treats missing timestamps as stale", () => {
    assert.equal(isLivePollFresh(null, 1_000), false);
    assert.equal(isLivePollFresh(undefined, 1_000), false);
  });

  it("is fresh inside the window and stale after it", () => {
    const now = 50_000;
    assert.equal(isLivePollFresh(now - LIVE_POLL_FRESH_MS + 1, now), true);
    assert.equal(isLivePollFresh(now - LIVE_POLL_FRESH_MS, now), false);
  });
});
