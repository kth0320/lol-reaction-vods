import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapPool } from "./map-pool";

describe("mapPool", () => {
  it("keeps order with a concurrency cap", async () => {
    const seen: number[] = [];
    let inflight = 0;
    let maxInflight = 0;
    const rows = await mapPool([3, 1, 4, 1, 5], 2, async (value, index) => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      seen.push(index);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inflight -= 1;
      return value * 10;
    });
    assert.deepEqual(rows, [30, 10, 40, 10, 50]);
    assert.ok(maxInflight <= 2);
    assert.deepEqual(seen.slice(0, 2).sort(), [0, 1]);
  });
});
