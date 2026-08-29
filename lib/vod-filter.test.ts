import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVodFilter, vodHubPath, vodHubReturnPath, vodMatchBack, vodMatchPath } from "./vod-filter";

describe("VOD filter URLs", () => {
  it("keeps year, stage, and search on the hub path", () => {
    assert.equal(vodHubPath("lck", 2026, "all"), "/vods/lck?year=2026");
    assert.equal(vodHubPath("lck", 2026, "cup", "KT"), "/vods/lck?year=2026&stage=cup&q=KT");
    assert.equal(vodMatchPath("m1", "lpl", 2026, "split3"), "/matches/m1?hub=lpl&year=2026&stage=split3");
  });

  it("falls back to the current year and 전체 when the query is junk", () => {
    const parsed = parseVodFilter({ year: "1999", stage: "nope", q: "  kt " }, [2026, 2025, 2024], "lck");
    assert.equal(parsed.year, 2026);
    assert.equal(parsed.stage, "all");
    assert.equal(parsed.q, "kt");
  });

  it("returns to the hub with the same year and stage", () => {
    assert.equal(vodHubReturnPath("lec", "2026", "summer"), "/vods/lec?year=2026&stage=summer");
    assert.equal(vodHubReturnPath(null, "2026", "all"), "/");
    assert.equal(vodHubReturnPath("lcs", "2026", "summer"), "/");
  });

  it("sends live matches home and ended matches back to their hub", () => {
    assert.deepEqual(vodMatchBack(true, "lck", "2026", "cup"), { href: "/", label: "← 메인" });
    assert.deepEqual(vodMatchBack(false, "lck", "2026", "cup"), {
      href: "/vods/lck?year=2026&stage=cup",
      label: "← LCK",
    });
    assert.deepEqual(vodMatchBack(false, null), { href: "/", label: "← 메인" });
  });
});
