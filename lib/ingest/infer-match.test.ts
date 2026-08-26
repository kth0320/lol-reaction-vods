import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aliasIndexInTitle, inferLiveMatchFromTitle, type InferTeam } from "./infer-match";

const teams: InferTeam[] = [
  { id: "kt", league: "LCK", aliases: ["KT", "케이티"] },
  { id: "bro", league: "LCK", aliases: ["BRO", "BRION", "브리온"] },
  { id: "g2", league: "LEC", aliases: ["G2"] },
  { id: "fnc", league: "LEC", aliases: ["FNC", "Fnatic"] },
  { id: "sk", league: "LEC", aliases: ["SK Gaming"] },
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

  it("does not treat variety or LEC titles as LCK KT vs BRO", () => {
    assert.equal(inferLiveMatchFromTitle("버츄얼 인간 가리지 않고 뎀프시롤 갈기기 (감컴/뚱딴지)", teams), null);
    const lec = inferLiveMatchFromTitle("Caedrel G2 vs FNC LEC", teams);
    assert.equal(lec?.key, "ingest-lec-fnc-g2");
  });

  it("does not match SK inside LCK", () => {
    assert.equal(aliasIndexInTitle("2026 LCK Playoffs", "SK"), -1);
    assert.ok(aliasIndexInTitle("KT vs BRO", "KT") >= 0);
  });
});
