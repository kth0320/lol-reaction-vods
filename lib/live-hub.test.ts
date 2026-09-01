import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { liveHubBadge, liveHubHref, liveHubRotateIndices, pickLiveHubByLeague } from "./live-hub";

describe("pickLiveHubByLeague", () => {
  it("keeps a live match over the next upcoming in that league", () => {
    const picked = pickLiveHubByLeague(
      [{ id: "lck-live", tournament: "LCK", startsAt: new Date("2026-09-01T08:00:00Z") }],
      [
        { id: "lck-next", tournament: "LCK", startsAt: new Date("2026-09-02T08:00:00Z") },
        { id: "lpl-next", tournament: "LPL", startsAt: new Date("2026-09-03T09:00:00Z") },
      ],
    );
    assert.equal(picked.LCK?.kind, "live");
    assert.equal(picked.LCK?.match.id, "lck-live");
    assert.equal(picked.LPL?.kind, "upcoming");
    assert.equal(picked.LPL?.match.id, "lpl-next");
    assert.equal(picked.LEC, null);
  });
});

describe("live hub card chrome", () => {
  it("only live cards link to the match page", () => {
    assert.equal(liveHubHref("live", "schedule-1"), "/matches/schedule-1");
    assert.equal(liveHubHref("upcoming", "schedule-2"), undefined);
    assert.equal(liveHubHref("empty", "none"), undefined);
    assert.equal(liveHubBadge("live"), "생중계");
    assert.equal(liveHubBadge("upcoming"), "예정");
    assert.equal(liveHubBadge("empty"), null);
  });

  it("rotates live leagues first and skips empty placeholders", () => {
    assert.deepEqual(liveHubRotateIndices(["live", "upcoming", "empty"]), [0]);
    assert.deepEqual(liveHubRotateIndices(["live", "live", "upcoming"]), [0, 1]);
    assert.deepEqual(liveHubRotateIndices(["upcoming", "empty", "upcoming"]), [0, 2]);
  });
});
