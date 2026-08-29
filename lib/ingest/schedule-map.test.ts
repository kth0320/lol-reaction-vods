import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { httpsAssetUrl, leagueIdsForSlugs, parseLeagues, parseScheduleEvents } from "./lolesports";
import {
  API_CODE_TO_TEAM_ID,
  attachInferredToOfficial,
  fallbackApiTeamId,
  mapScheduleEvents,
  prototypeLeagueSlugs,
  resolveScheduleTeamId,
  scheduleEventStatus,
  scheduleMatchId,
  tournamentFromSlug,
  usesLiveCandidates,
  vodHubScheduleSlugs,
} from "./schedule-map";

const teams = [
  { id: "ns", abbr: "NS", name: "Nongshim RedForce", aliases: ["NS", "농심"] },
  { id: "bfx", abbr: "BFX", name: "BNK FEARX", aliases: ["BFX", "FearX"] },
  { id: "dnf", abbr: "DNS", name: "DN SOOPers", aliases: ["DNS", "DNF"] },
  { id: "drx", abbr: "DRX", name: "KIWOOM DRX", aliases: ["DRX", "KRX"] },
  { id: "koi", abbr: "KOI", name: "Movistar KOI", aliases: ["KOI", "MKOI"] },
  { id: "th", abbr: "TH", name: "Team Heretics", aliases: ["TH", "Heretics"] },
  { id: "shft", abbr: "SHFT", name: "Shifters", aliases: ["SHFT"] },
  { id: "t1", abbr: "T1", name: "T1", aliases: ["T1"] },
];

describe("lolesports schedule parse", () => {
  it("resolves league ids from slugs instead of hardcoded ids", () => {
    const leagues = parseLeagues({
      data: {
        leagues: [
          { id: "lck-id-1", slug: "lck", name: "LCK" },
          { id: "lec-id-9", slug: "lec", name: "LEC" },
          { id: "lpl-id-3", slug: "lpl", name: "LPL" },
        ],
      },
    });
    const ids = leagueIdsForSlugs(leagues, ["lck", "lec"]);
    assert.equal(ids.get("lck"), "lck-id-1");
    assert.equal(ids.get("lec"), "lec-id-9");
    assert.equal(ids.has("lpl"), false);
  });

  it("reads match id, teams, and best-of from a schedule event", () => {
    const events = parseScheduleEvents({
      data: {
        schedule: {
          events: [
            {
              startTime: "2026-08-27T08:00:00Z",
              state: "unstarted",
              type: "match",
              blockName: "Play-Ins",
              league: { name: "LCK", slug: "lck" },
              match: {
                id: "117030752644841577",
                teams: [
                  {
                    name: "NONGSHIM RED FORCE",
                    code: "NS",
                    image: "http://static.lolesports.com/teams/NSFullonDark.png",
                  },
                  {
                    name: "BNK FEARX",
                    code: "BFX",
                    image: "http://static.lolesports.com/teams/bfx.png",
                  },
                ],
                strategy: { type: "bestOf", count: 5 },
              },
            },
          ],
        },
      },
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].matchId, "117030752644841577");
    assert.equal(events[0].bestOf, 5);
    assert.deepEqual(
      events[0].teams.map((team) => team.code),
      ["NS", "BFX"],
    );
    assert.equal(events[0].teams[0].imageUrl, "https://static.lolesports.com/teams/NSFullonDark.png");
    assert.equal(httpsAssetUrl("http://static.lolesports.com/teams/a.png"), "https://static.lolesports.com/teams/a.png");
  });
});

describe("schedule mapping", () => {
  it("maps API codes onto catalog teams and skips TBD", () => {
    assert.equal(resolveScheduleTeamId(teams, "DNS", "DN SOOPers"), "dnf");
    assert.equal(resolveScheduleTeamId(teams, "KRX", "KIWOOM DRX"), "drx");
    assert.equal(resolveScheduleTeamId(teams, "MKOI", "Movistar KOI"), "koi");
    assert.equal(resolveScheduleTeamId(teams, "TBD", "TBD"), null);
    assert.equal(API_CODE_TO_TEAM_ID.DNS, "dnf");
  });

  it("treats in-progress and pregame windows as live vs-cards", () => {
    const start = new Date("2026-08-27T08:00:00Z");
    assert.equal(scheduleEventStatus("inProgress", start, 5, new Date("2026-08-27T10:00:00Z")), "live");
    assert.equal(scheduleEventStatus("unstarted", start, 5, new Date("2026-08-27T07:00:00Z")), "live");
    assert.equal(scheduleEventStatus("unstarted", start, 5, new Date("2026-08-27T05:00:00Z")), "upcoming");
    assert.equal(scheduleEventStatus("completed", start, 5, new Date("2026-08-27T14:00:00Z")), "ended");
  });

  it("does not create vs-cards for TBD playoff slots", () => {
    const mapped = mapScheduleEvents(
      [
        {
          startTime: "2026-08-29T08:00:00Z",
          state: "unstarted",
          type: "match",
          blockName: "Playoffs",
          leagueSlug: "lck",
          matchId: "tbd-1",
          bestOf: 5,
          teams: [
            { code: "TBD", name: "TBD", imageUrl: "" },
            { code: "TBD", name: "TBD", imageUrl: "" },
          ],
        },
        {
          startTime: "2026-08-27T08:00:00Z",
          state: "unstarted",
          type: "match",
          blockName: "Play-Ins",
          leagueSlug: "lck",
          matchId: "117030752644841577",
          bestOf: 5,
          teams: [
            { code: "NS", name: "NONGSHIM RED FORCE", imageUrl: "https://static.lolesports.com/teams/NSFullonDark.png" },
            { code: "BFX", name: "BNK FEARX", imageUrl: "https://static.lolesports.com/teams/bfx.png" },
          ],
        },
      ],
      teams,
      new Date("2026-08-27T07:00:00Z"),
    );
    assert.equal(mapped.length, 1);
    assert.equal(mapped[0].id, scheduleMatchId("117030752644841577"));
    assert.equal(mapped[0].blueTeamId, "ns");
    assert.equal(mapped[0].redTeamId, "bfx");
    assert.equal(mapped[0].status, "live");
    assert.equal(mapped[0].league, "LCK");
    assert.equal(mapped[0].blueImageUrl, "https://static.lolesports.com/teams/NSFullonDark.png");
    assert.equal(mapped[0].redImageUrl, "https://static.lolesports.com/teams/bfx.png");
  });

  it("maps LPL and Worlds slugs and creates api-{code} teams when the catalog has no row", () => {
    assert.equal(tournamentFromSlug("lpl"), "LPL");
    assert.equal(tournamentFromSlug("worlds"), "Worlds");
    assert.equal(tournamentFromSlug("msi"), "MSI");
    assert.equal(tournamentFromSlug("first_stand"), "First Stand");
    assert.equal(tournamentFromSlug("ewc_lol"), "EWC");
    assert.equal(fallbackApiTeamId("TES"), "api-tes");
    assert.equal(resolveScheduleTeamId(teams, "TES", "Top Esports"), "api-tes");
    assert.deepEqual(prototypeLeagueSlugs(), ["lck", "lec"]);
    assert.ok(vodHubScheduleSlugs().includes("lpl"));
    assert.ok(vodHubScheduleSlugs().includes("worlds"));

    const mapped = mapScheduleEvents(
      [
        {
          startTime: "2026-10-15T10:00:00Z",
          state: "completed",
          type: "match",
          blockName: "Swiss",
          leagueSlug: "worlds",
          matchId: "worlds-t1-g2",
          bestOf: 1,
          teams: [
            { code: "T1", name: "T1", imageUrl: "" },
            { code: "G2", name: "G2 Esports", imageUrl: "" },
          ],
        },
        {
          startTime: "2026-08-20T11:00:00Z",
          state: "completed",
          type: "match",
          blockName: "정규",
          leagueSlug: "lpl",
          matchId: "lpl-tes-jdg",
          bestOf: 3,
          teams: [
            { code: "TES", name: "Top Esports", imageUrl: "" },
            { code: "JDG", name: "JD Gaming", imageUrl: "" },
          ],
        },
      ],
      [
        ...teams,
        { id: "g2", abbr: "G2", name: "G2 Esports", aliases: ["G2"] },
        { id: "jdg", abbr: "JDG", name: "JD Gaming", aliases: ["JDG"] },
      ],
      new Date("2026-08-29T00:00:00Z"),
    );
    assert.equal(mapped.length, 2);
    assert.equal(mapped[0].league, "Worlds");
    assert.equal(mapped[0].blueTeamId, "t1");
    assert.equal(mapped[0].redTeamId, "g2");
    assert.equal(mapped[1].league, "LPL");
    assert.equal(mapped[1].blueTeamId, "api-tes");
    assert.equal(mapped[1].redTeamId, "jdg");
    assert.equal(mapped[1].status, "ended");
  });

  it("attaches a streamer title to the official match, not an ingest key", () => {
    const official = [
      {
        id: "schedule-117030752644841577",
        tournament: "LCK",
        blueTeamId: "ns",
        redTeamId: "bfx",
        status: "live",
        startsAt: new Date("2026-08-27T08:00:00Z"),
      },
      {
        id: "schedule-lec-th-shft",
        tournament: "LEC",
        blueTeamId: "th",
        redTeamId: "shft",
        status: "upcoming",
        startsAt: new Date("2026-08-28T15:00:00Z"),
      },
    ];
    assert.equal(
      attachInferredToOfficial({ league: "LCK", blueTeamId: "bfx", redTeamId: "ns" }, official),
      "schedule-117030752644841577",
    );
    assert.equal(attachInferredToOfficial({ league: "LCK", blueTeamId: "t1", redTeamId: "gen" }, official), null);
    assert.equal(usesLiveCandidates("schedule"), true);
    assert.equal(usesLiveCandidates("seed"), false);
  });
});
