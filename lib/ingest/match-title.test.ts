import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickPrototypeLiveMatch, scoreTitleForMatch } from "./match-title";

const lec = {
  id: "lec-live-g2-fnc",
  tournament: "LEC",
  blueAliases: ["G2", "G2 Esports"],
  redAliases: ["FNC", "Fnatic"],
};

const lck = {
  id: "lck-live-gen-dk",
  tournament: "LCK",
  blueAliases: ["GEN", "젠지"],
  redAliases: ["DK"],
};

describe("pickPrototypeLiveMatch", () => {
  it("does not attach LCK watch-party titles to the LEC seed match", () => {
    assert.equal(pickPrototypeLiveMatch("울챔스 / KT vs BRO #LCKWatchPArty", [lec, lck]), null);
    assert.equal(scoreTitleForMatch("[LCK P.O] KT vs 브리온 #LCKWatchparty", lec), 0);
  });

  it("attaches an LEC title with both teams to the LEC match", () => {
    const picked = pickPrototypeLiveMatch("Caedrel G2 vs FNC LEC", [lec, lck]);
    assert.equal(picked?.id, "lec-live-g2-fnc");
  });

  it("ignores unrelated live titles", () => {
    assert.equal(pickPrototypeLiveMatch("버츄얼 인간 가리지 않고 뎀프시롤 갈기기", [lec]), null);
  });
});
