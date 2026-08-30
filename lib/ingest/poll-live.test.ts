import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PROTOTYPE_LIVE_LEAGUES } from "@/lib/leagues";
import { attachTitleToOfficial, type OfficialLiveMatch } from "./attach-live";

function official(overrides: Partial<OfficialLiveMatch> & Pick<OfficialLiveMatch, "id" | "tournament" | "blueTeamId" | "redTeamId">): OfficialLiveMatch {
  return {
    status: "live",
    startsAt: new Date("2026-08-30T09:00:00Z"),
    blueTeam: { abbr: "JDG", name: "JD Gaming", aliases: [{ alias: "징동" }] },
    redTeam: { abbr: "WE", name: "Team WE", aliases: [{ alias: "웨이" }] },
    ...overrides,
  };
}

const lpl = official({
  id: "schedule-117155436343202142",
  tournament: "LPL",
  blueTeamId: "jdg",
  redTeamId: "we",
});

const lec = official({
  id: "schedule-lec-vit-shft",
  tournament: "LEC",
  blueTeamId: "vit",
  redTeamId: "shft",
  blueTeam: { abbr: "VIT", name: "Team Vitality", aliases: [] },
  redTeam: { abbr: "SHFT", name: "Shifters", aliases: [] },
});

describe("attach live titles to official matches", () => {
  it("includes LPL in the live attach pool", () => {
    assert.deepEqual([...PROTOTYPE_LIVE_LEAGUES], ["LCK", "LPL", "LEC"]);
  });

  it("attaches Caedrel, 훈수킹, and 롱다리코치 LPL titles to JDG vs WE", () => {
    const pool = [lec, lpl];
    assert.equal(
      attachTitleToOfficial("🔴LPL PLAYOFFS WE VS JDG🔴", pool)?.id,
      "schedule-117155436343202142",
    );
    assert.equal(
      attachTitleToOfficial("[LPL] WE vs 징동 카리스 어바웃 멍키 vs 갈라 홍큐 #LCKWatchparty#LPLCOstream", pool)?.id,
      "schedule-117155436343202142",
    );
    assert.equal(
      attachTitleToOfficial("[ WE vs JDG ] 치킨 시켜!! | 프로 코치 LCK/LPL/LEC 예측 및 분석#LPLCostream", pool)?.id,
      "schedule-117155436343202142",
    );
  });

  it("does not attach those LPL titles when the pool is LCK and LEC only", () => {
    assert.equal(attachTitleToOfficial("🔴LPL PLAYOFFS WE VS JDG🔴", [lec]), null);
    assert.equal(attachTitleToOfficial("[LPL] WE vs 징동 #LCKWatchparty#LPLCOstream", [lec]), null);
  });
});
