import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseChzzkVideos, parseSoopVods, parseYouTubeAtom, fetchVodsForChannel } from "./vod-list";
import { shouldFetchVods } from "./platforms";
import { vodInMatchWindow } from "./vod-window";
import { pickMatchForVod } from "./attach-vod";

describe("vod ingest platforms", () => {
  it("never fetches Twitch native VODs", () => {
    assert.equal(shouldFetchVods("twitch"), false);
    assert.equal(shouldFetchVods("youtube"), true);
    assert.equal(shouldFetchVods("chzzk"), true);
    assert.equal(shouldFetchVods("soop"), true);
  });
});

describe("vod list parsers", () => {
  it("reads YouTube Atom uploads", () => {
    const rows = parseYouTubeAtom(`
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
        <title>Caedrel</title>
        <entry>
          <yt:videoId>abc123XYZ-_</yt:videoId>
          <title>THE BATTLE FOR SECOND PLACE - T1 VS HLE - LCK SUMMER 2026</title>
          <published>2026-08-08T12:30:00+00:00</published>
        </entry>
      </feed>
    `);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].platform, "youtube");
    assert.equal(rows[0].externalId, "abc123XYZ-_");
    assert.match(rows[0].url, /abc123XYZ-_/);
  });

  it("keeps Chzzk REPLAY rows and drops other types", () => {
    const rows = parseChzzkVideos({
      content: {
        data: [
          { videoNo: 11, videoType: "REPLAY", videoTitle: "LCK T1 vs HLE", publishDateAt: 1754640000000 },
          { videoNo: 12, videoType: "CLIP", videoTitle: "clip", publishDateAt: 1754640000000 },
        ],
      },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].platform, "chzzk");
    assert.equal(rows[0].externalId, "11");
    assert.equal(rows[0].url, "https://chzzk.naver.com/video/11");
  });

  it("reads SOOP station VODs", () => {
    const rows = parseSoopVods({
      data: [{ title_no: 203731555, title_name: "김민교 LCK T1 vs HLE", reg_date: "2026-08-08 20:30:00" }],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].platform, "soop");
    assert.equal(rows[0].externalId, "203731555");
    assert.equal(rows[0].url, "https://vod.sooplive.com/player/203731555");
  });

  it("returns nothing when asked to fetch Twitch VODs", async () => {
    const rows = await fetchVodsForChannel("twitch", "caedrel", async () => {
      throw new Error("twitch vod fetch should not run");
    });
    assert.deepEqual(rows, []);
  });
});

describe("vod match window and attach", () => {
  const t1hle = {
    id: "lck-2026-summer-t1-hle",
    tournament: "LCK",
    status: "ended",
    startsAt: new Date("2026-08-08T17:00:00+09:00"),
    bestOf: 3,
    blueTeamId: "t1",
    redTeamId: "hle",
    blueAliases: ["T1", "티원"],
    redAliases: ["HLE", "한화"],
  };

  it("accepts next-day YouTube edits inside the window", () => {
    assert.equal(vodInMatchWindow(new Date("2026-08-09T10:00:00+09:00"), t1hle.startsAt, 3), true);
    assert.equal(vodInMatchWindow(new Date("2026-08-12T10:00:00+09:00"), t1hle.startsAt, 3), false);
  });

  it("attaches an LCK YouTube title to the official match", () => {
    const hit = pickMatchForVod(
      "THE BATTLE FOR SECOND PLACE - T1 VS HLE - LCK SUMMER 2026",
      new Date("2026-08-08T21:00:00+09:00"),
      [t1hle],
    );
    assert.equal(hit?.id, t1hle.id);
  });

  it("does not attach a title outside the match window", () => {
    const hit = pickMatchForVod("T1 VS HLE LCK", new Date("2026-07-01T12:00:00+09:00"), [t1hle]);
    assert.equal(hit, null);
  });
});
