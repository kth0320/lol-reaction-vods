import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VOD_HUB_CARDS,
  countReactionsByHub,
  hubMatchTournaments,
  isVodHubId,
  matchTournamentToHub,
  vodHubMatchWhere,
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

  it("only lists ended matches that already have reaction VODs", () => {
    const where = vodHubMatchWhere("lck");
    assert.equal(where.status, "ended");
    assert.deepEqual(where.tournament, { in: ["LCK"] });
    assert.deepEqual(where.reactions, { some: {} });
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
});
