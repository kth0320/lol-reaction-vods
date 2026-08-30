import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aliasIndexInTitle, inferLiveMatchFromTitle, type InferTeam } from "./infer-match";

const teams: InferTeam[] = [
  { id: "kt", league: "LCK", aliases: ["KT", "케이티"] },
  { id: "bro", league: "LCK", aliases: ["BRO", "BRION", "브리온"] },
  { id: "g2", league: "LEC", aliases: ["G2"] },
  { id: "fnc", league: "LEC", aliases: ["FNC", "Fnatic"] },
  { id: "sk", league: "LEC", aliases: ["SK", "SK Gaming"] },
  { id: "koi", league: "LEC", aliases: ["KOI", "MKOI"] },
  { id: "blg", league: "LPL", aliases: ["BLG"] },
];

describe("inferLiveMatchFromTitle", () => {
  it("reads KT vs BRO LCK titles in either language", () => {
    const fromWolf = inferLiveMatchFromTitle("울챔스 / KT vs BRO #LCKWatchPArty", teams);
    assert.equal(fromWolf?.key, "ingest-lck-bro-kt");
    assert.equal(fromWolf?.blueTeamId, "kt");
    assert.equal(fromWolf?.redTeamId, "bro");
    const fromSoop = inferLiveMatchFromTitle("[LCK P.O] KT vs 브리온 #LCKWatchparty", teams);
    assert.equal(fromSoop?.key, "ingest-lck-bro-kt");
    const fromObsess = inferLiveMatchFromTitle("🗿KT vs BROOOOO Bo5 LCK Play-Ins #LCKWatchparty", teams);
    assert.equal(fromObsess?.key, "ingest-lck-bro-kt");
  });

  it("does not treat variety or LEC-only noise as LCK KT vs BRO", () => {
    assert.equal(inferLiveMatchFromTitle("버츄얼 인간 가리지 않고 뎀프시롤 갈기기 (감컴/뚱딴지)", teams), null);
    const lec = inferLiveMatchFromTitle("Caedrel G2 vs FNC LEC", teams);
    assert.equal(lec?.key, "ingest-lec-fnc-g2");
    const lpl = inferLiveMatchFromTitle("울프 LPL JDG vs BLG", [
      ...teams,
      { id: "jdg", league: "LPL", aliases: ["JDG"] },
      { id: "blg", league: "LPL", aliases: ["BLG"] },
    ]);
    assert.equal(lpl?.league, "LPL");
    assert.equal(lpl?.key, "ingest-lpl-blg-jdg");
  });

  it("attaches LPL costream titles even when they also say #LCKWatchparty", () => {
    const lplTeams: InferTeam[] = [
      ...teams,
      { id: "jdg", league: "LPL", aliases: ["JDG", "징동"] },
      { id: "we", league: "LPL", aliases: ["WE", "Team WE", "웨이"] },
    ];
    const hunsu = inferLiveMatchFromTitle(
      "[LPL] WE vs 징동 카리스 어바웃 멍키 vs 갈라 홍큐 #LCKWatchparty#LPLCOstream",
      lplTeams,
    );
    assert.equal(hunsu?.league, "LPL");
    assert.equal(hunsu?.blueTeamId, "we");
    assert.equal(hunsu?.redTeamId, "jdg");
    const longdari = inferLiveMatchFromTitle(
      "[ WE vs JDG ] 치킨 시켜!! | 프로 코치 LCK/LPL/LEC 예측 및 분석#LPLCostream",
      lplTeams,
    );
    assert.equal(longdari?.league, "LPL");
    assert.equal(longdari?.blueTeamId, "we");
    assert.equal(longdari?.redTeamId, "jdg");
    const caedrel = inferLiveMatchFromTitle("🔴LPL PLAYOFFS WE VS JDG🔴", lplTeams);
    assert.equal(caedrel?.league, "LPL");
    assert.equal(caedrel?.key, "ingest-lpl-jdg-we");
  });

  it("allows cross-region Worlds pairs", () => {
    const worlds = inferLiveMatchFromTitle("T1 vs G2 Worlds", [
      { id: "t1", league: "LCK", aliases: ["T1"] },
      { id: "g2", league: "LEC", aliases: ["G2"] },
    ]);
    assert.equal(worlds?.league, "Worlds");
    assert.equal(worlds?.key, "ingest-worlds-g2-t1");
  });

  it("does not match SK inside LCK", () => {
    assert.equal(aliasIndexInTitle("2026 LCK Playoffs", "SK"), -1);
    assert.ok(aliasIndexInTitle("KT vs BRO", "KT") >= 0);
  });

  it("treats glued vs as a team boundary", () => {
    assert.ok(aliasIndexInTitle("SKvsG2, FNCvsMKOI", "SK") >= 0);
    assert.ok(aliasIndexInTitle("SKvsG2, FNCvsMKOI", "G2") >= 0);
    assert.ok(aliasIndexInTitle("SKvsG2, FNCvsMKOI", "FNC") >= 0);
    assert.ok(aliasIndexInTitle("SKvsG2, FNCvsMKOI", "MKOI") >= 0);
    const glued = inferLiveMatchFromTitle("주말예능LEC!!! - SKvsG2, FNCvsMKOI", teams);
    assert.equal(glued?.league, "LEC");
    assert.ok(glued?.key === "ingest-lec-g2-sk" || glued?.key === "ingest-lec-fnc-koi");
  });

  it("reads First Stand from #FST2026", () => {
    const fst = inferLiveMatchFromTitle("G2 vs BLG #FST2026", teams);
    assert.equal(fst?.league, "First Stand");
    assert.equal(fst?.key, "ingest-firststand-blg-g2");
  });
});
