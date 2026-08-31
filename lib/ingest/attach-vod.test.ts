import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickMatchForVod, pickMatchesForVod, vsPairInTitle, type VodAttachMatch } from "./attach-vod";

function match(partial: Partial<VodAttachMatch> & Pick<VodAttachMatch, "id" | "blueTeamId" | "redTeamId">): VodAttachMatch {
  return {
    tournament: "LEC",
    status: "ended",
    startsAt: new Date("2026-08-02T16:00:00Z"),
    bestOf: 1,
    blueAliases: [],
    redAliases: [],
    ...partial,
  };
}

describe("pickMatchesForVod", () => {
  it("reads glued SKvsG2 and attaches both series from a doubleheader title", () => {
    const skG2 = match({
      id: "lec-sk-g2",
      blueTeamId: "sk",
      redTeamId: "g2",
      blueAliases: ["SK", "SK Gaming"],
      redAliases: ["G2"],
      startsAt: new Date("2026-08-02T15:00:00Z"),
    });
    const fncKoi = match({
      id: "lec-fnc-koi",
      blueTeamId: "fnc",
      redTeamId: "koi",
      blueAliases: ["FNC", "Fnatic"],
      redAliases: ["KOI", "MKOI"],
      startsAt: new Date("2026-08-02T17:00:00Z"),
    });
    const gxSk = match({
      id: "lec-gx-sk",
      blueTeamId: "gx",
      redTeamId: "sk",
      blueAliases: ["GX"],
      redAliases: ["SK"],
      startsAt: new Date("2026-08-01T16:00:00Z"),
    });

    assert.equal(vsPairInTitle("SKvsG2, FNCvsMKOI", skG2.blueAliases, skG2.redAliases), true);
    assert.equal(vsPairInTitle("SKvsG2, FNCvsMKOI", fncKoi.blueAliases, fncKoi.redAliases), true);
    assert.equal(vsPairInTitle("SKvsG2, FNCvsMKOI", gxSk.blueAliases, gxSk.redAliases), false);

    const hits = pickMatchesForVod(
      "주말예능LEC!!! - SKvsG2, FNCvsMKOI",
      new Date("2026-08-02T19:00:00Z"),
      [skG2, fncKoi, gxSk],
    );
    assert.deepEqual(
      hits.map((row) => row.id).sort(),
      ["lec-fnc-koi", "lec-sk-g2"],
    );
  });

  it("attaches both LEC series from a spaced doubleheader title", () => {
    const kcSk = match({
      id: "lec-kc-sk",
      blueTeamId: "kc",
      redTeamId: "sk",
      blueAliases: ["KC", "Karmine"],
      redAliases: ["SK"],
      startsAt: new Date("2026-08-30T15:00:00Z"),
    });
    const naviGx = match({
      id: "lec-navi-gx",
      blueTeamId: "navi",
      redTeamId: "gx",
      blueAliases: ["NAVI"],
      redAliases: ["GX"],
      startsAt: new Date("2026-08-30T17:00:00Z"),
    });
    const hits = pickMatchesForVod(
      "LEC 정규 마지막주!! / KC vs SK - NAVI vs GX",
      new Date("2026-08-30T19:00:00Z"),
      [kcSk, naviGx],
    );
    assert.deepEqual(
      hits.map((row) => row.id).sort(),
      ["lec-kc-sk", "lec-navi-gx"],
    );
  });

  it("attaches First Stand from a #FST2026 title", () => {
    const g2Blg = match({
      id: "fst-g2-blg",
      tournament: "First Stand",
      blueTeamId: "g2",
      redTeamId: "blg",
      blueAliases: ["G2"],
      redAliases: ["BLG"],
      startsAt: new Date("2026-03-10T16:00:00Z"),
    });
    assert.equal(
      pickMatchForVod("G2 vs BLG 본방 #FST2026", new Date("2026-03-10T18:00:00Z"), [g2Blg])?.id,
      "fst-g2-blg",
    );
  });
});
