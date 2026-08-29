import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterVodMatches, teamFieldMatchesQuery } from "./vod-search";

const ktBro = {
  id: "kt-bro",
  blue: { abbr: "KT", name: "KT Rolster", aliases: ["KT", "케이티"] },
  red: { abbr: "BRO", name: "BRION", aliases: ["BRO", "브리온"] },
};

const t1Hle = {
  id: "t1-hle",
  blue: { abbr: "T1", name: "T1", aliases: ["T1", "티원", "SKT"] },
  red: { abbr: "HLE", name: "Hanwha Life Esports", aliases: ["HLE", "한화"] },
};

describe("vod match search", () => {
  it("does not treat KT as a substring of T1's old SKT alias", () => {
    assert.equal(teamFieldMatchesQuery("SKT", "KT"), false);
    assert.equal(teamFieldMatchesQuery("KT", "KT"), true);
    assert.deepEqual(
      filterVodMatches([ktBro, t1Hle], "KT").map((row) => row.id),
      ["kt-bro"],
    );
  });

  it("finds KT by Korean alias and ignores unrelated T1 matches", () => {
    assert.deepEqual(
      filterVodMatches([ktBro, t1Hle], "케이티").map((row) => row.id),
      ["kt-bro"],
    );
  });

  it("returns every match when the query is empty or a single letter", () => {
    assert.deepEqual(
      filterVodMatches([ktBro, t1Hle], "  ").map((row) => row.id),
      ["kt-bro", "t1-hle"],
    );
    assert.deepEqual(
      filterVodMatches([ktBro, t1Hle], "K").map((row) => row.id),
      ["kt-bro", "t1-hle"],
    );
  });

  it("requires every token to match a team in the series", () => {
    assert.deepEqual(
      filterVodMatches([ktBro, t1Hle], "kt t1").map((row) => row.id),
      [],
    );
    assert.deepEqual(
      filterVodMatches([ktBro, t1Hle], "t1 한화").map((row) => row.id),
      ["t1-hle"],
    );
  });

  it("filters LEC teams the same way as LCK", () => {
    const lec = [
      {
        id: "g2-fnc",
        blue: { abbr: "G2", name: "G2 Esports", aliases: ["G2"] },
        red: { abbr: "FNC", name: "Fnatic", aliases: ["FNC"] },
      },
      {
        id: "kc-vit",
        blue: { abbr: "KC", name: "Karmine Corp", aliases: ["KC"] },
        red: { abbr: "VIT", name: "Team Vitality", aliases: ["VIT"] },
      },
    ];
    assert.deepEqual(
      filterVodMatches(lec, "G2").map((row) => row.id),
      ["g2-fnc"],
    );
  });
});
