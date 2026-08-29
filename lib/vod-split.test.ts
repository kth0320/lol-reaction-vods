import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hubStageOptions, matchStageId, stageLabelForMatch } from "./vod-split";

describe("VOD split filters", () => {
  it("splits 2026 LCK into Cup and regular LCK", () => {
    const options = hubStageOptions("lck", 2026).map((row) => row.label);
    assert.deepEqual(options, ["전체", "LCK컵", "LCK"]);
    assert.equal(matchStageId("lck", "Week 1", new Date("2026-01-20T08:00:00Z")), "cup");
    assert.equal(matchStageId("lck", "Week 10", new Date("2026-07-29T08:00:00Z")), "lck");
    assert.equal(matchStageId("lck", "Playoffs", new Date("2026-08-29T08:00:00Z")), "lck");
  });

  it("uses LPL Split 1-3 and keeps Knights Rivals inside the split, not 선발전", () => {
    assert.deepEqual(
      hubStageOptions("lpl", 2026).map((row) => row.label),
      ["전체", "Split 1", "Split 2", "Split 3", "선발전"],
    );
    assert.equal(matchStageId("lpl", "Week 1", new Date("2026-02-10T09:00:00Z")), "split1");
    assert.equal(matchStageId("lpl", "Week 1", new Date("2026-05-10T09:00:00Z")), "split2");
    assert.equal(matchStageId("lpl", "Play In Knockouts", new Date("2026-08-28T06:00:00Z")), "split3");
    assert.equal(matchStageId("lpl", "Regional Finals", new Date("2026-09-17T09:00:00Z")), "gauntlet");
  });

  it("uses LEC Versus then Spring and Summer", () => {
    assert.deepEqual(
      hubStageOptions("lec", 2026).map((row) => row.label),
      ["전체", "버서스", "스프링", "서머"],
    );
    assert.deepEqual(
      hubStageOptions("lec", 2025).map((row) => row.label),
      ["전체", "윈터", "스프링", "서머"],
    );
    assert.equal(matchStageId("lec", "Week 1", new Date("2026-01-20T15:00:00Z")), "versus");
    assert.equal(matchStageId("lec", "Week 5", new Date("2026-04-24T15:00:00Z")), "spring");
    assert.equal(matchStageId("lec", "Week 1", new Date("2026-07-24T14:30:00Z")), "summer");
  });

  it("groups Worlds MSI First Stand EWC by stage", () => {
    assert.equal(matchStageId("worlds", "Swiss", new Date("2024-10-03T13:00:00Z")), "swiss");
    assert.equal(matchStageId("worlds", "Quarterfinals", new Date("2024-10-17T12:00:00Z")), "knockout");
    assert.equal(matchStageId("msi", "Play-Ins", new Date("2024-05-01T08:00:00Z")), "playin");
    assert.equal(matchStageId("first-stand", "Groups", new Date("2026-03-16T13:00:00Z")), "groups");
    assert.equal(matchStageId("ewc", "Finals", new Date("2026-07-19T10:00:00Z")), "knockout");
  });

  it("labels a match with the hub stage, not the API week name", () => {
    assert.equal(stageLabelForMatch("lck", "Week 1", new Date("2026-01-20T08:00:00Z")), "LCK컵");
    assert.equal(stageLabelForMatch("lpl", "Play In Knockouts", new Date("2026-08-28T06:00:00Z")), "Split 3");
    assert.equal(stageLabelForMatch("worlds", "Swiss", new Date("2024-10-03T13:00:00Z")), "스위스");
  });
});
