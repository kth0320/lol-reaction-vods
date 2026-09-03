import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creatorProfileImage } from "./creator-image";

describe("creatorProfileImage", () => {
  it("prefers the watch platform's stored profile", () => {
    assert.equal(
      creatorProfileImage({
        preferredPlatform: "chzzk",
        candidates: [
          { platform: "soop", imageUrl: "https://soop.example/a.jpg" },
          { platform: "chzzk", imageUrl: "https://chzzk.example/b.jpg" },
        ],
      }),
      "https://chzzk.example/b.jpg",
    );
  });

  it("falls back to a SOOP channel logo when no live profile is stored", () => {
    assert.equal(
      creatorProfileImage({
        channels: [{ platform: "soop", channelId: "ehdrb866" }],
      }),
      "https://profile.img.sooplive.co.kr/LOGO/eh/ehdrb866/ehdrb866.jpg",
    );
  });

  it("returns empty when nothing is stored", () => {
    assert.equal(creatorProfileImage({ candidates: [{ platform: "chzzk", imageUrl: "  " }] }), "");
  });
});
