import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VOD_HUB_CARDS,
  countHubStats,
  countReactionsByHub,
  hubMatchTournaments,
  isVodHubId,
  matchTournamentToHub,
  vodHubMatchWhere,
  vodHubSearchExample,
  vodAttachTournaments,
  hubUsesLeagueSeasons,
  hubUsesEventYears,
  hubTournamentForArt,
} from "./vod-hub";

describe("vod hub", () => {
  it("has the seven tournament cards in the requested order", () => {
    assert.deepEqual(
      VOD_HUB_CARDS.map((card) => card.label),
      ["롤드컵", "MSI", "퍼스트스탠드", "EWC", "LCK", "LPL", "LEC"],
    );
  });

  it("maps match tournaments onto hub ids", () => {
    assert.equal(matchTournamentToHub("LCK"), "lck");
    assert.equal(matchTournamentToHub("Worlds"), "worlds");
    assert.equal(matchTournamentToHub("First Stand"), "first-stand");
    assert.equal(isVodHubId("ewc"), true);
    assert.equal(isVodHubId("lcs"), false);
  });

  it("lists match tournament strings that map back to the same hub", () => {
    for (const card of VOD_HUB_CARDS) {
      for (const tournament of hubMatchTournaments(card.id)) {
        assert.equal(matchTournamentToHub(tournament), card.id);
      }
    }
  });

  it("lists ended matches that have reaction VODs", () => {
    const where = vodHubMatchWhere("lck");
    assert.equal(where.status, "ended");
    assert.deepEqual(where.tournament, { in: ["LCK"] });
    assert.deepEqual(where.OR, [{ reactions: { some: {} } }]);
  });

  it("also lists ended matches that were seen live even before VODs attach", () => {
    const where = vodHubMatchWhere("lck", ["schedule-t1-hle"]);
    assert.deepEqual(where.OR, [{ reactions: { some: {} } }, { id: { in: ["schedule-t1-hle"] } }]);
  });

  it("uses one search box for every tournament hub, including LEC and later Worlds/LPL", () => {
    assert.equal(vodHubSearchExample("lck"), "KT");
    assert.equal(vodHubSearchExample("lec"), "G2");
    assert.equal(vodHubSearchExample("lpl"), "JDG");
    for (const card of VOD_HUB_CARDS) {
      assert.ok(vodHubSearchExample(card.id).length > 0, card.id);
    }
  });

  it("counts seed LCK reactions on the LCK card only", () => {
    const counts = countReactionsByHub([
      { tournament: "LCK", reactionCount: 5 },
      { tournament: "LEC", reactionCount: 2 },
    ]);
    assert.equal(counts.lck, 5);
    assert.equal(counts.lec, 2);
    assert.equal(counts.worlds, 0);
    assert.equal(counts.lpl, 0);
  });

  it("counts ended matches that already have reactions, plus the reaction total", () => {
    const stats = countHubStats([
      { tournament: "LCK", reactionCount: 3 },
      { tournament: "LCK", reactionCount: 2 },
      { tournament: "LCK", reactionCount: 0 },
      { tournament: "LEC", reactionCount: 1 },
    ]);
    assert.deepEqual(stats.lck, { matchCount: 2, reactionCount: 5 });
    assert.deepEqual(stats.lec, { matchCount: 1, reactionCount: 1 });
    assert.deepEqual(stats.worlds, { matchCount: 0, reactionCount: 0 });
  });

  it("lists every hub tournament so VOD attach is not limited to LCK/LEC", () => {
    assert.ok(vodAttachTournaments().includes("LPL"));
    assert.ok(vodAttachTournaments().includes("Worlds"));
    assert.ok(vodAttachTournaments().includes("EWC"));
  });

  it("maps hub cards onto official league art tournaments", () => {
    assert.equal(hubTournamentForArt("worlds"), "Worlds");
    assert.equal(hubTournamentForArt("first-stand"), "First Stand");
    assert.equal(hubTournamentForArt("lck"), "LCK");
    assert.equal(hubTournamentForArt("ewc"), "EWC");
  });

  it("puts season selects on LCK LPL LEC and year selects on international hubs", () => {
    assert.equal(hubUsesLeagueSeasons("lck"), true);
    assert.equal(hubUsesLeagueSeasons("worlds"), false);
    assert.equal(hubUsesEventYears("worlds"), true);
    assert.equal(hubUsesEventYears("lck"), false);
  });
});
