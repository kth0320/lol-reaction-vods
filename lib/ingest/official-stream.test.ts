import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  eventSeriesIsLive,
  mutedBroadcastSrc,
  parseEventGameWins,
  parseEventGames,
  parseEventLook,
  parseEventStreams,
  pickMutedBackground,
} from "./official-stream";

const lckDetails = {
  data: {
    event: {
      league: {
        slug: "lck",
        name: "LCK",
        image: "http://static.lolesports.com/leagues/lck-color-on-black.png",
      },
      match: {
        teams: [
          { code: "T1", name: "T1", image: "http://static.lolesports.com/teams/t1.png" },
          { code: "KT", name: "kt Rolster", image: "http://static.lolesports.com/teams/kt.png" },
        ],
      },
      streams: [
        { provider: "twitch", parameter: "lck", locale: "en-US" },
        { provider: "afreecatv", parameter: "aflol", locale: "ko-KR" },
        { provider: "twitch", parameter: "otplol_", locale: "fr-FR" },
      ],
    },
  },
};

describe("official muted background", () => {
  it("reads lolesports event streams", () => {
    const streams = parseEventStreams(lckDetails);
    assert.equal(streams.length, 3);
    assert.equal(streams[1].provider, "afreecatv");
    assert.equal(streams[1].parameter, "aflol");
  });

  it("prefers a muting iframe (Twitch) over the Korean SOOP feed", () => {
    const picked = pickMutedBackground(parseEventStreams(lckDetails));
    assert.deepEqual(picked, { provider: "twitch", id: "lck" });
  });

  it("prefers YouTube when the event lists one", () => {
    const picked = pickMutedBackground([
      { provider: "twitch", parameter: "lck", locale: "en-US" },
      { provider: "youtube", parameter: "abc123", locale: "en-US" },
    ]);
    assert.deepEqual(picked, { provider: "youtube", id: "abc123" });
  });

  it("builds a muted Twitch player URL for the page host", () => {
    assert.equal(
      mutedBroadcastSrc({ provider: "twitch", id: "lck" }, "127.0.0.1"),
      "https://player.twitch.tv/?channel=lck&parent=127.0.0.1&parent=localhost&autoplay=true&muted=true",
    );
  });

  it("reads official league mark and team logos from event details", () => {
    const look = parseEventLook(lckDetails);
    assert.equal(look.leagueImageUrl, "https://static.lolesports.com/leagues/lck-color-on-black.png");
    assert.equal(look.blueImageUrl, "https://static.lolesports.com/teams/t1.png");
    assert.equal(look.redImageUrl, "https://static.lolesports.com/teams/kt.png");
    assert.deepEqual(look.broadcast, { provider: "twitch", id: "lck" });
  });

  it("treats a completed schedule event as live when a game is still inProgress", () => {
    const details = {
      data: {
        event: {
          match: {
            strategy: { count: 5 },
            teams: [
              { code: "JDG", result: { gameWins: 0 } },
              { code: "WE", result: { gameWins: 2 } },
            ],
            games: [
              { number: 1, state: "completed" },
              { number: 2, state: "completed" },
              { number: 3, state: "inProgress" },
              { number: 4, state: "unstarted" },
              { number: 5, state: "unstarted" },
            ],
          },
        },
      },
    };
    assert.deepEqual(parseEventGameWins(details), [0, 2]);
    assert.equal(parseEventGames(details)[2]?.state, "inProgress");
    assert.equal(eventSeriesIsLive(details, 5), true);
    assert.equal(
      eventSeriesIsLive(
        {
          data: {
            event: {
              match: {
                teams: [
                  { result: { gameWins: 3 } },
                  { result: { gameWins: 1 } },
                ],
                games: [
                  { number: 1, state: "completed" },
                  { number: 2, state: "completed" },
                  { number: 3, state: "completed" },
                  { number: 4, state: "completed" },
                  { number: 5, state: "unstarted" },
                ],
              },
            },
          },
        },
        5,
      ),
      false,
    );
  });
});
