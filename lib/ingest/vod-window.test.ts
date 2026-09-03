import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VOD_RECENT_ENDED_MS, matchBlocksVodIngest, matchEndedWithin } from "./vod-window";

describe("matchEndedWithin", () => {
  const now = Date.parse("2026-09-03T14:00:00.000Z");

  it("keeps a BO3 that ended a few hours ago", () => {
    assert.equal(
      matchEndedWithin(
        { status: "ended", startsAt: new Date("2026-09-03T06:00:00.000Z"), bestOf: 3 },
        VOD_RECENT_ENDED_MS,
        now,
      ),
      true,
    );
  });

  it("drops a match that ended more than 24 hours ago", () => {
    assert.equal(
      matchEndedWithin(
        { status: "ended", startsAt: new Date("2026-09-01T08:00:00.000Z"), bestOf: 5 },
        VOD_RECENT_ENDED_MS,
        now,
      ),
      false,
    );
  });

  it("ignores live matches", () => {
    assert.equal(
      matchEndedWithin(
        { status: "live", startsAt: new Date("2026-09-03T13:00:00.000Z"), bestOf: 3 },
        VOD_RECENT_ENDED_MS,
        now,
      ),
      false,
    );
  });
});

describe("matchBlocksVodIngest", () => {
  const now = Date.parse("2026-09-03T14:00:00.000Z");

  it("pauses replay ingest while a BO3 is on air", () => {
    assert.equal(
      matchBlocksVodIngest({ status: "live", startsAt: new Date("2026-09-03T13:00:00.000Z"), bestOf: 3 }, now),
      true,
    );
  });

  it("pauses for a series that has not started yet", () => {
    assert.equal(
      matchBlocksVodIngest({ status: "live", startsAt: new Date("2026-09-03T15:00:00.000Z"), bestOf: 3 }, now),
      true,
    );
  });

  it("does not pause forever on a stale live row", () => {
    assert.equal(
      matchBlocksVodIngest({ status: "live", startsAt: new Date("2026-09-03T01:00:00.000Z"), bestOf: 3 }, now),
      false,
    );
  });

  it("does not pause on ended matches", () => {
    assert.equal(
      matchBlocksVodIngest({ status: "ended", startsAt: new Date("2026-09-03T13:00:00.000Z"), bestOf: 3 }, now),
      false,
    );
  });
});
