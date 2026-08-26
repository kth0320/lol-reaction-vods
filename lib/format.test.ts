import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatViewers } from "./format";

describe("formatViewers", () => {
  it("shows a dash when the count is missing", () => {
    assert.equal(formatViewers(null), "-");
    assert.equal(formatViewers(undefined), "-");
  });

  it("keeps small counts as locale numbers", () => {
    assert.equal(formatViewers(0), "0");
    assert.equal(formatViewers(1200), "1,200");
  });

  it("uses 만 for 10,000 and above", () => {
    assert.equal(formatViewers(10_000), "1만");
    assert.equal(formatViewers(15_000), "1.5만");
    assert.equal(formatViewers(62_846), "6.3만");
    assert.equal(formatViewers(100_000), "10만");
  });
});
