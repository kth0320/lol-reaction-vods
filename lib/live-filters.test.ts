import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterLiveCasts } from "./live-filters";

describe("filterLiveCasts", () => {
  const casts = [
    { id: "a", platform: "youtube" },
    { id: "b", platform: "soop" },
    { id: "c", platform: "chzzk" },
  ];

  it("keeps every cast when the platform filter is all", () => {
    assert.equal(filterLiveCasts(casts, "all").length, 3);
  });

  it("filters by platform", () => {
    assert.deepEqual(
      filterLiveCasts(casts, "soop").map((cast) => cast.id),
      ["b"],
    );
  });
});
