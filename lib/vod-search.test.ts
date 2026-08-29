import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterVodMatches, vodMatchHaystack } from "./vod-search";

describe("vod match search", () => {
  const rows = [
    {
      id: "kt-bro",
      haystack: vodMatchHaystack(["LCK", "KT", "KT Rolster", "케이티", "BRO", "OKSavingsBank BRION"]),
    },
    {
      id: "t1-hle",
      haystack: vodMatchHaystack(["LCK", "T1", "티원", "HLE", "한화"]),
    },
  ];

  it("returns every match when the query is empty", () => {
    assert.deepEqual(
      filterVodMatches(rows, "  ").map((row) => row.id),
      ["kt-bro", "t1-hle"],
    );
  });

  it("finds KT by abbr or Korean alias", () => {
    assert.deepEqual(
      filterVodMatches(rows, "KT").map((row) => row.id),
      ["kt-bro"],
    );
    assert.deepEqual(
      filterVodMatches(rows, "케이티").map((row) => row.id),
      ["kt-bro"],
    );
  });

  it("requires every token to match", () => {
    assert.deepEqual(
      filterVodMatches(rows, "kt t1").map((row) => row.id),
      [],
    );
    assert.deepEqual(
      filterVodMatches(rows, "t1 한화").map((row) => row.id),
      ["t1-hle"],
    );
  });
});
