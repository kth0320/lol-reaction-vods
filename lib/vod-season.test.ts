import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kstDateKey, kstYear } from "./format";
import { hubUsesEventYears, hubUsesLeagueSeasons } from "./vod-hub";
import { filterMatchesBySeason, hubYearFilter, pastYearEmptyMessage, vodArchiveYears, vodYearOptionLabel } from "./vod-season";

describe("VOD year filters", () => {
  it("lists the current KST year and the two years before it", () => {
    assert.deepEqual(vodArchiveYears(new Date("2026-08-29T00:00:00Z")), [2026, 2025, 2024]);
    assert.equal(vodYearOptionLabel(2025, "season"), "2025 시즌");
    assert.equal(vodYearOptionLabel(2025, "year"), "2025년");
  });

  it("uses Seoul calendar year so a New Year KST match is not the UTC year", () => {
    assert.equal(kstYear(new Date("2025-12-31T16:00:00Z")), 2026);
    assert.equal(kstYear(new Date("2026-08-08T08:00:00Z")), 2026);
    assert.equal(kstDateKey(new Date("2025-10-15T05:00:00Z")), "2025-10-15");
    assert.equal(kstDateKey(new Date("2025-10-14T16:00:00Z")), "2025-10-15");
  });

  it("uses 시즌 on LCK LPL LEC and 연도 on Worlds MSI First Stand EWC", () => {
    assert.equal(hubUsesLeagueSeasons("lck"), true);
    assert.equal(hubUsesEventYears("worlds"), true);
    assert.equal(hubYearFilter("lck")?.heading, "시즌");
    assert.equal(hubYearFilter("lck")?.kind, "season");
    assert.equal(hubYearFilter("worlds")?.heading, "연도");
    assert.equal(hubYearFilter("worlds")?.kind, "year");
    assert.equal(hubYearFilter("msi")?.kind, "year");
    assert.equal(hubYearFilter("ewc")?.kind, "year");
    assert.equal(hubYearFilter("first-stand")?.kind, "year");
  });

  it("shows only matches from the selected year", () => {
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

  it("keeps a placeholder copy for empty past years", () => {
    assert.match(pastYearEmptyMessage(2025, "year"), /2025년/);
    assert.match(pastYearEmptyMessage(2024, "season"), /2024 시즌/);
  });
});
