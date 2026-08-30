import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aliasInTitle, pickPrototypeLiveMatch, scoreTitleForMatch } from "./match-title";

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

  it("attaches an LCK title with both teams to the LCK match", () => {
    const picked = pickPrototypeLiveMatch("울챔스 GEN vs DK #LCKWatchParty", [lec, lck]);
    assert.equal(picked?.id, "lck-live-gen-dk");
  });

  it("attaches an LEC title with both teams to the LEC match", () => {
    const picked = pickPrototypeLiveMatch("Caedrel G2 vs FNC LEC", [lec, lck]);
    assert.equal(picked?.id, "lec-live-g2-fnc");
  });

  it("ignores unrelated live titles", () => {
    assert.equal(pickPrototypeLiveMatch("버츄얼 인간 가리지 않고 뎀프시롤 갈기기", [lec]), null);
  });

  it("does not treat KT as a substring of SKT in a title", () => {
    assert.equal(aliasInTitle("SKT vs HLE", "KT"), false);
    assert.equal(aliasInTitle("KT vs BRO", "KT"), true);
  });

  it("attaches Worlds and LPL titles to those hub matches", () => {
    const worlds = {
      id: "worlds-t1-g2",
      tournament: "Worlds",
      blueAliases: ["T1"],
      redAliases: ["G2"],
    };
    const lpl = {
      id: "lpl-jdg-blg",
      tournament: "LPL",
      blueAliases: ["JDG"],
      redAliases: ["BLG"],
    };
    assert.equal(pickPrototypeLiveMatch("T1 vs G2 Worlds", [lec, lck, worlds])?.id, "worlds-t1-g2");
    assert.equal(pickPrototypeLiveMatch("울프 LPL JDG vs BLG", [lec, lck, lpl])?.id, "lpl-jdg-blg");
    assert.equal(scoreTitleForMatch("T1 vs G2 Worlds", lck), 0);
  });

  it("attaches today's LPL costream titles to JDG vs WE", () => {
    const lpl = {
      id: "schedule-117155436343202142",
      tournament: "LPL",
      blueAliases: ["JDG", "징동"],
      redAliases: ["WE", "Team WE", "웨이"],
    };
    assert.equal(
      pickPrototypeLiveMatch("[LPL] WE vs 징동 #LCKWatchparty#LPLCOstream", [lec, lck, lpl])?.id,
      "schedule-117155436343202142",
    );
    assert.equal(
      pickPrototypeLiveMatch("[ WE vs JDG ] 프로 코치 LCK/LPL/LEC #LPLCostream", [lec, lck, lpl])?.id,
      "schedule-117155436343202142",
    );
    assert.equal(
      pickPrototypeLiveMatch("🔴LPL PLAYOFFS WE VS JDG🔴", [lec, lck, lpl])?.id,
      "schedule-117155436343202142",
    );
  });
});
