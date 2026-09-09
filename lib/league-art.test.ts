import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLeagues } from "./ingest/lolesports";
import {
  hasMatchupPlate,
  leagueArtForTournament,
  parseLeagueArt,
  resolveMatchArt,
  slugForTournament,
} from "./league-art";

const leaguesPayload = {
  data: {
    leagues: [
      {
        id: "lck-id",
        slug: "lck",
        name: "LCK",
        image: "http://static.lolesports.com/leagues/lck-color-on-black.png",
      },
      {
        id: "worlds-id",
        slug: "worlds",
        name: "Worlds",
        image: "http://static.lolesports.com/leagues/WorldsDarkBG.png",
      },
      { id: "empty-id", slug: "cblol", name: "CBLOL" },
    ],
  },
};

describe("official league marks", () => {
  it("parses getLeagues images as https marks", () => {
    const leagues = parseLeagues(leaguesPayload);
    assert.equal(leagues[0].imageUrl, "https://static.lolesports.com/leagues/lck-color-on-black.png");
    assert.equal(leagues[2].imageUrl, "");
    const art = parseLeagueArt(leaguesPayload);
    assert.equal(art.get("lck"), "https://static.lolesports.com/leagues/lck-color-on-black.png");
    assert.equal(art.has("cblol"), false);
  });

  it("maps tournament labels onto league slugs", () => {
    assert.equal(slugForTournament("LCK"), "lck");
    assert.equal(slugForTournament("First Stand"), "first_stand");
    assert.equal(slugForTournament("EWC"), "ewc_lol");
    const art = parseLeagueArt(leaguesPayload);
    assert.equal(
      leagueArtForTournament(art, "LCK"),
      "/leagues/lck.png",
    );
    assert.equal(leagueArtForTournament(art, "LEC"), "/leagues/lec.png");
    assert.equal(leagueArtForTournament(undefined, "LCK"), "/leagues/lck.png");
  });

  it("prefers event-detail logos and hides the muted stream when a plate exists", () => {
    const art = parseLeagueArt(leaguesPayload);
    const resolved = resolveMatchArt({
      tournament: "LCK",
      leagueArt: art,
      eventLeagueImageUrl: "",
      eventBlueImageUrl: "https://static.lolesports.com/teams/t1.png",
      eventRedImageUrl: "https://static.lolesports.com/teams/kt.png",
      storedBlueImageUrl: "https://old.example/blue.png",
      storedRedImageUrl: "https://old.example/red.png",
      broadcast: { provider: "twitch", id: "lck" },
    });
    assert.equal(resolved.leagueImageUrl, "/leagues/lck.png");
    assert.equal(resolved.blueImageUrl, "https://static.lolesports.com/teams/t1.png");
    assert.equal(resolved.redImageUrl, "https://static.lolesports.com/teams/kt.png");
    assert.equal(resolved.broadcast, null);
    assert.equal(hasMatchupPlate(resolved), true);
  });

  it("falls back to the muted stream when league mark and both logos are missing", () => {
    const resolved = resolveMatchArt({
      tournament: "CBLOL",
      storedBlueImageUrl: "",
      storedRedImageUrl: "",
      broadcast: { provider: "youtube", id: "abc" },
    });
    assert.deepEqual(resolved.broadcast, { provider: "youtube", id: "abc" });
    assert.equal(hasMatchupPlate(resolved), false);
  });
});
