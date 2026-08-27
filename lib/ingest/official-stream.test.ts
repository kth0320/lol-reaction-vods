import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mutedBroadcastSrc, parseEventStreams, pickMutedBackground } from "./official-stream";

const lckDetails = {
  data: {
    event: {
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
      "https://player.twitch.tv/?channel=lck&parent=127.0.0.1&autoplay=true&muted=true",
    );
  });
});
