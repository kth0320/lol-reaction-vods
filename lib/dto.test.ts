import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toOpsMatchDto, toOpsReactionDto } from "./dto";

describe("ops DTOs", () => {
  it("maps a match row without leaking Prisma relations", () => {
    const dto = toOpsMatchDto({
      id: "schedule-1",
      tournament: "LCK",
      split: "Week 1",
      bestOf: 3,
      startsAt: new Date("2026-08-08T08:00:00Z"),
      blueTeam: { abbr: "T1", name: "T1" },
      redTeam: { abbr: "HLE", name: "Hanwha Life Esports" },
      _count: { reactions: 2 },
    });
    assert.equal(dto.id, "schedule-1");
    assert.equal(dto.blueAbbr, "T1");
    assert.equal(dto.redName, "Hanwha Life Esports");
    assert.equal(dto.reactionCount, 2);
    assert.equal(dto.startsAt, "2026-08-08T08:00:00.000Z");
  });

  it("maps a reaction row for the ops list", () => {
    const dto = toOpsReactionDto({
      id: "r1",
      matchId: "schedule-1",
      creatorId: "untara",
      creator: { name: "운타라" },
      platform: "chzzk",
      title: "T1 vs HLE",
      url: "https://chzzk.naver.com/video/11",
      externalId: "11",
      publishedAt: new Date("2026-08-08T12:00:00Z"),
    });
    assert.equal(dto.creatorName, "운타라");
    assert.equal(dto.publishedAt, "2026-08-08T12:00:00.000Z");
  });
});
