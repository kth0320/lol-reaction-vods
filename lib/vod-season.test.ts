import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kstYear } from "./format";
import { hubUsesLeagueSeasons } from "./vod-hub";
import { filterMatchesBySeason, leagueVodSeasons, seasonLabel } from "./vod-season";

describe("league VOD seasons", () => {
  it("lists the current KST year and the two years before it", () => {
    assert.deepEqual(leagueVodSeasons(new Date("2026-08-29T00:00:00Z")), [2026, 2025, 2024]);
    assert.equal(seasonLabel(2025), "2025 시즌");
  });

  it("uses Seoul calendar year so a New Year KST match is not the UTC year", () => {
    assert.equal(kstYear(new Date("2025-12-31T16:00:00Z")), 2026);
    assert.equal(kstYear(new Date("2026-08-08T08:00:00Z")), 2026);
  });

  it("keeps season selects on LCK LPL LEC only", () => {
    assert.equal(hubUsesLeagueSeasons("lck"), true);
    assert.equal(hubUsesLeagueSeasons("lpl"), true);
    assert.equal(hubUsesLeagueSeasons("lec"), true);
    assert.equal(hubUsesLeagueSeasons("worlds"), false);
    assert.equal(hubUsesLeagueSeasons("msi"), false);
  });

  it("shows only matches from the selected season", () => {
    const rows = [
      { id: "kt-2026", seasonYear: 2026 },
      { id: "kt-2025", seasonYear: 2025 },
    ];
    assert.deepEqual(
      filterMatchesBySeason(rows, 2026).map((row) => row.id),
      ["kt-2026"],
    );
    assert.deepEqual(filterMatchesBySeason(rows, 2024), []);
  });
});
