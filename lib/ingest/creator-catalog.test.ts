import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldDropSyncedChannel } from "./creator-catalog";

describe("shouldDropSyncedChannel", () => {
  it("keeps auto-collected channels even when they are not in the JSON whitelist", () => {
    const wanted = new Set(["chzzk\0wolf"]);
    assert.equal(
      shouldDropSyncedChannel(
        { platform: "chzzk", channelId: "new1", creator: { discovered: true } },
        wanted,
      ),
      false,
    );
    assert.equal(
      shouldDropSyncedChannel(
        { platform: "chzzk", channelId: "old", creator: { discovered: false } },
        wanted,
      ),
      true,
    );
    assert.equal(
      shouldDropSyncedChannel(
        { platform: "chzzk", channelId: "wolf", creator: { discovered: false } },
        wanted,
      ),
      false,
    );
  });
});
