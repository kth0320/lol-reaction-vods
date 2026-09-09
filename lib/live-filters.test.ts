import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterLiveCasts } from "./live-filters";

describe("filterLiveCasts", () => {
  const casts = [
    { id: "a", platform: "youtube", viewerCount: 1200 },
    { id: "b", platform: "soop", viewerCount: 30 },
    { id: "c", platform: "chzzk", viewerCount: 29 },
    { id: "d", platform: "soop", viewerCount: null },
  ];

  it("hides casts under 30 viewers, including missing counts", () => {
    assert.deepEqual(
      filterLiveCasts(casts, "all").map((cast) => cast.id),
      ["a", "b"],
    );
  });

  it("filters by platform among casts with enough viewers", () => {
    assert.deepEqual(
      filterLiveCasts(casts, "soop").map((cast) => cast.id),
      ["b"],
    );
  });
});
