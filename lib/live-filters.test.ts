import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterLiveCasts } from "./live-filters";

describe("filterLiveCasts", () => {
  const casts = [
    { id: "a", platform: "youtube", supportingTeamId: "gen" },
    { id: "b", platform: "soop", supportingTeamId: "dk" },
    { id: "c", platform: "chzzk", supportingTeamId: null },
  ];

  it("keeps every cast when filters are all", () => {
    assert.equal(filterLiveCasts(casts, "all", "all").length, 3);
  });

  it("filters by supporting team", () => {
    assert.deepEqual(
      filterLiveCasts(casts, "gen", "all").map((cast) => cast.id),
      ["a"],
    );
  });

  it("filters neutral support", () => {
    assert.deepEqual(
      filterLiveCasts(casts, "neutral", "all").map((cast) => cast.id),
      ["c"],
    );
  });

  it("filters by platform", () => {
    assert.deepEqual(
      filterLiveCasts(casts, "all", "soop").map((cast) => cast.id),
      ["b"],
    );
  });
});
