import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { seedShouldWipe } from "./keep-collected";

describe("seedShouldWipe", () => {
  it("wipes only a fully empty database", () => {
    assert.equal(seedShouldWipe({ reactionVods: 0, matches: 0, liveTitles: 0 }), true);
  });

  it("keeps even the five prototype reaction rows", () => {
    assert.equal(seedShouldWipe({ reactionVods: 5, matches: 3, liveTitles: 0 }), false);
  });

  it("keeps schedule matches with no VODs yet", () => {
    assert.equal(seedShouldWipe({ reactionVods: 0, matches: 12, liveTitles: 0 }), false);
  });

  it("keeps live-title history used to attach VODs", () => {
    assert.equal(seedShouldWipe({ reactionVods: 0, matches: 0, liveTitles: 40 }), false);
  });
});
