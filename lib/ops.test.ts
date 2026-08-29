import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachReaction } from "./ops";

describe("ops attach validation", () => {
  it("rejects Twitch and unknown URLs before touching the database", async () => {
    await assert.rejects(
      () => attachReaction({ matchId: "m1", creatorId: "untara", url: "https://www.twitch.tv/videos/1" }),
      /YouTube·치지직·숲/,
    );
    await assert.rejects(
      () => attachReaction({ matchId: "", creatorId: "untara", url: "https://www.youtube.com/watch?v=ujj0H0ycY4k" }),
      /경기와 방송인/,
    );
  });
});
