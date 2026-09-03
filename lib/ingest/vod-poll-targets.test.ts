import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creatorIdsWaitingForReplay } from "./vod-poll-targets";

describe("creatorIdsWaitingForReplay", () => {
  it("keeps a live caster who has no replay on that ended match", () => {
    const waiting = creatorIdsWaitingForReplay({
      liveTitles: [
        { creatorId: "tamtam", matchId: "t1-hle" },
        { creatorId: "minkyo", matchId: "t1-hle" },
      ],
      endedMatchIds: new Set(["t1-hle"]),
      attached: [{ creatorId: "minkyo", matchId: "t1-hle" }],
    });
    assert.deepEqual([...waiting].sort(), ["tamtam"]);
  });

  it("does not fetch someone whose only live row is a different match they already filled", () => {
    const waiting = creatorIdsWaitingForReplay({
      liveTitles: [{ creatorId: "wolf", matchId: "gen-kt" }],
      endedMatchIds: new Set(["t1-hle", "gen-kt"]),
      attached: [{ creatorId: "wolf", matchId: "gen-kt" }],
    });
    assert.deepEqual([...waiting], []);
  });
});
