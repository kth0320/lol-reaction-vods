import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mentionedVodTournaments, titleMentionsTournament } from "./tournament-title";

describe("tournament title tokens", () => {
  it("treats 월즈 and 월드 챔피언십 as Worlds", () => {
    assert.equal(titleMentionsTournament("월즈 입중계 T1 응원방", "Worlds"), true);
    assert.equal(titleMentionsTournament("2025 월드 챔피언십", "Worlds"), true);
    assert.equal(titleMentionsTournament("롤드컵 결승", "Worlds"), true);
    assert.deepEqual(mentionedVodTournaments("울챔스 / 스위스 Day 1 #WORLDS2025"), ["Worlds"]);
  });

  it("treats spaced 퍼스트 스탠드 as First Stand", () => {
    assert.equal(titleMentionsTournament("한화 vs KC 퍼스트 스탠드", "First Stand"), true);
    assert.equal(titleMentionsTournament("퍼스트스탠드 결승", "First Stand"), true);
  });

  it("does not treat a random 퍼스트 as First Stand", () => {
    assert.equal(titleMentionsTournament("아크 레이더스 : 더 퍼스트 레이더스", "First Stand"), false);
  });
});
