import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pickMatchForVod,
  pickMatchesForVod,
  pickMatchesForVodWithLiveTitles,
  storedVodIsUnrelatedToMatch,
  vsPairInTitle,
  type VodAttachMatch,
} from "./attach-vod";

function match(partial: Partial<VodAttachMatch> & Pick<VodAttachMatch, "id" | "blueTeamId" | "redTeamId">): VodAttachMatch {
  return {
    tournament: "LEC",
    status: "ended",
    startsAt: new Date("2026-08-02T16:00:00Z"),
    bestOf: 1,
    blueAliases: [],
    redAliases: [],
    ...partial,
  };
}

describe("pickMatchesForVod", () => {
  it("reads glued SKvsG2 and attaches both series from a doubleheader title", () => {
    const skG2 = match({
      id: "lec-sk-g2",
      blueTeamId: "sk",
      redTeamId: "g2",
      blueAliases: ["SK", "SK Gaming"],
      redAliases: ["G2"],
      startsAt: new Date("2026-08-02T15:00:00Z"),
    });
    const fncKoi = match({
      id: "lec-fnc-koi",
      blueTeamId: "fnc",
      redTeamId: "koi",
      blueAliases: ["FNC", "Fnatic"],
      redAliases: ["KOI", "MKOI"],
      startsAt: new Date("2026-08-02T17:00:00Z"),
    });
    const gxSk = match({
      id: "lec-gx-sk",
      blueTeamId: "gx",
      redTeamId: "sk",
      blueAliases: ["GX"],
      redAliases: ["SK"],
      startsAt: new Date("2026-08-01T16:00:00Z"),
    });

    assert.equal(vsPairInTitle("SKvsG2, FNCvsMKOI", skG2.blueAliases, skG2.redAliases), true);
    assert.equal(vsPairInTitle("SKvsG2, FNCvsMKOI", fncKoi.blueAliases, fncKoi.redAliases), true);
    assert.equal(vsPairInTitle("SKvsG2, FNCvsMKOI", gxSk.blueAliases, gxSk.redAliases), false);

    const hits = pickMatchesForVod(
      "주말예능LEC!!! - SKvsG2, FNCvsMKOI",
      new Date("2026-08-02T19:00:00Z"),
      [skG2, fncKoi, gxSk],
    );
    assert.deepEqual(
      hits.map((row) => row.id).sort(),
      ["lec-fnc-koi", "lec-sk-g2"],
    );
  });

  it("attaches both LEC series from a spaced doubleheader title", () => {
    const kcSk = match({
      id: "lec-kc-sk",
      blueTeamId: "kc",
      redTeamId: "sk",
      blueAliases: ["KC", "Karmine"],
      redAliases: ["SK"],
      startsAt: new Date("2026-08-30T15:00:00Z"),
    });
    const naviGx = match({
      id: "lec-navi-gx",
      blueTeamId: "navi",
      redTeamId: "gx",
      blueAliases: ["NAVI"],
      redAliases: ["GX"],
      startsAt: new Date("2026-08-30T17:00:00Z"),
    });
    const hits = pickMatchesForVod(
      "LEC 정규 마지막주!! / KC vs SK - NAVI vs GX",
      new Date("2026-08-30T19:00:00Z"),
      [kcSk, naviGx],
    );
    assert.deepEqual(
      hits.map((row) => row.id).sort(),
      ["lec-kc-sk", "lec-navi-gx"],
    );
  });

  it("attaches First Stand from a #FST2026 title", () => {
    const g2Blg = match({
      id: "fst-g2-blg",
      tournament: "First Stand",
      blueTeamId: "g2",
      redTeamId: "blg",
      blueAliases: ["G2"],
      redAliases: ["BLG"],
      startsAt: new Date("2026-03-10T16:00:00Z"),
    });
    assert.equal(
      pickMatchForVod("G2 vs BLG 본방 #FST2026", new Date("2026-03-10T18:00:00Z"), [g2Blg])?.id,
      "fst-g2-blg",
    );
  });

  it("attaches TL vs TES First Stand when Liquid is stored as TLAW", () => {
    const tlTes = match({
      id: "fst-tl-tes",
      tournament: "First Stand",
      blueTeamId: "api-tlaw",
      redTeamId: "tes",
      blueAliases: ["TLAW", "TL", "Team Liquid"],
      redAliases: ["TES"],
      startsAt: new Date("2025-03-11T11:00:00Z"),
    });
    assert.equal(vsPairInTitle("울챔스 / CFO vs KC - TL vs TES #FST2025", ["TLAW", "TL"], ["TES"]), true);
    assert.equal(
      pickMatchForVod("울챔스 / TL vs TES #FST2025", new Date("2025-03-11T14:00:00Z"), [tlTes])?.id,
      "fst-tl-tes",
    );
  });

  it("attaches a Worlds Swiss day stream to every Swiss match that KST day", () => {
    const day1 = [
      match({
        id: "w-vks-tsw",
        tournament: "Worlds",
        split: "Swiss",
        blueTeamId: "vks",
        redTeamId: "tsw",
        blueAliases: ["VKS"],
        redAliases: ["TSW"],
        startsAt: new Date("2025-10-15T05:00:00Z"),
      }),
      match({
        id: "w-t1-fly",
        tournament: "Worlds",
        split: "Swiss",
        blueTeamId: "t1",
        redTeamId: "fly",
        blueAliases: ["T1"],
        redAliases: ["FLY"],
        startsAt: new Date("2025-10-15T09:00:00Z"),
      }),
      match({
        id: "w-qf",
        tournament: "Worlds",
        split: "Quarterfinals",
        blueTeamId: "t1",
        redTeamId: "al",
        blueAliases: ["T1"],
        redAliases: ["AL"],
        startsAt: new Date("2025-10-31T08:00:00Z"),
      }),
    ];
    const hits = pickMatchesForVod(
      "울챔스 / 스위스 스테이지 Day 1 | 2025 월드 챔피언십 #WORLDS2025",
      new Date("2025-10-15T12:00:00Z"),
      day1,
    );
    assert.deepEqual(
      hits.map((row) => row.id).sort(),
      ["w-t1-fly", "w-vks-tsw"],
    );
  });

  it("attaches a 2024 EU Worlds Swiss day stream even when the VOD posts next KST morning", () => {
    const day1 = match({
      id: "w24-t1-tes",
      tournament: "Worlds",
      split: "Swiss",
      blueTeamId: "t1",
      redTeamId: "tes",
      blueAliases: ["T1"],
      redAliases: ["TES"],
      startsAt: new Date("2024-10-03T12:00:00Z"),
    });
    const day1b = match({
      id: "w24-wbg-gen",
      tournament: "Worlds",
      split: "Swiss",
      blueTeamId: "wbg",
      redTeamId: "gen",
      blueAliases: ["WBG"],
      redAliases: ["GEN"],
      startsAt: new Date("2024-10-03T14:00:00Z"),
    });
    const day2 = match({
      id: "w24-lng-blg",
      tournament: "Worlds",
      split: "Swiss",
      blueTeamId: "lng",
      redTeamId: "blg",
      blueAliases: ["LNG"],
      redAliases: ["BLG"],
      startsAt: new Date("2024-10-04T12:00:00Z"),
    });
    const hits = pickMatchesForVod(
      "울챔스 / 스위스 스테이지 1일차 #worlds2024",
      new Date("2024-10-03T16:00:00Z"),
      [day1, day1b, day2],
    );
    assert.deepEqual(
      hits.map((row) => row.id).sort(),
      ["w24-t1-tes", "w24-wbg-gen"],
    );
  });

  it("keeps one EU Swiss day together when it crosses Seoul midnight", () => {
    const early = match({
      id: "w24-early",
      tournament: "Worlds",
      split: "Swiss",
      blueTeamId: "t1",
      redTeamId: "tes",
      blueAliases: ["T1"],
      redAliases: ["TES"],
      startsAt: new Date("2024-10-03T12:00:00Z"),
    });
    const late = match({
      id: "w24-late",
      tournament: "Worlds",
      split: "Swiss",
      blueTeamId: "dk",
      redTeamId: "fnc",
      blueAliases: ["DK"],
      redAliases: ["FNC"],
      startsAt: new Date("2024-10-03T16:00:00Z"),
    });
    const next = match({
      id: "w24-next",
      tournament: "Worlds",
      split: "Swiss",
      blueTeamId: "lng",
      redTeamId: "blg",
      blueAliases: ["LNG"],
      redAliases: ["BLG"],
      startsAt: new Date("2024-10-04T12:00:00Z"),
    });
    const hits = pickMatchesForVod(
      "울챔스 / 스위스 스테이지 1일차 #worlds2024",
      new Date("2024-10-03T11:00:00Z"),
      [early, late, next],
    );
    assert.deepEqual(
      hits.map((row) => row.id).sort(),
      ["w24-early", "w24-late"],
    );
  });

  it("does not attach a 2025 Worlds Day 1 stream to 2024 Swiss", () => {
    const worlds2024 = match({
      id: "w24",
      tournament: "Worlds",
      split: "Swiss",
      blueTeamId: "t1",
      redTeamId: "tes",
      blueAliases: ["T1"],
      redAliases: ["TES"],
      startsAt: new Date("2024-10-03T12:00:00Z"),
    });
    const worlds2025 = match({
      id: "w25",
      tournament: "Worlds",
      split: "Swiss",
      blueTeamId: "vks",
      redTeamId: "tsw",
      blueAliases: ["VKS"],
      redAliases: ["TSW"],
      startsAt: new Date("2025-10-15T05:00:00Z"),
    });
    const hits = pickMatchesForVod(
      "울챔스 / 스위스 스테이지 Day 1 | 2025 월드 챔피언십 #WORLDS2025",
      new Date("2025-10-15T04:00:00Z"),
      [worlds2024, worlds2025],
    );
    assert.deepEqual(
      hits.map((row) => row.id),
      ["w25"],
    );
  });

  it("attaches a 월즈 cheer-room title to that team's matches that day", () => {
    const t1Gen = match({
      id: "w-t1-gen",
      tournament: "Worlds",
      split: "Swiss",
      blueTeamId: "t1",
      redTeamId: "gen",
      blueAliases: ["T1"],
      redAliases: ["GEN", "젠지"],
      startsAt: new Date("2025-10-18T09:00:00Z"),
    });
    const g2Blg = match({
      id: "w-g2-blg",
      tournament: "Worlds",
      split: "Swiss",
      blueTeamId: "g2",
      redTeamId: "blg",
      blueAliases: ["G2"],
      redAliases: ["BLG"],
      startsAt: new Date("2025-10-18T10:00:00Z"),
    });
    const hits = pickMatchesForVod(
      "월즈 입중계 T1 응원방 끝까지 다 봅니댜",
      new Date("2025-10-18T12:00:00Z"),
      [t1Gen, g2Blg],
    );
    assert.deepEqual(
      hits.map((row) => row.id),
      ["w-t1-gen"],
    );
  });

  it("does not attach timezone-prep or Road to MSI titles to international matches", () => {
    const msi = match({
      id: "msi-t1-gen",
      tournament: "MSI",
      split: "Play-Ins",
      blueTeamId: "t1",
      redTeamId: "gen",
      blueAliases: ["T1"],
      redAliases: ["GEN"],
      startsAt: new Date("2025-06-26T08:00:00Z"),
    });
    assert.equal(pickMatchForVod("MSI 시차 맞추기", new Date("2025-06-26T10:00:00Z"), [msi]), null);
    const lck = match({
      id: "lck-t1-gen",
      tournament: "LCK",
      blueTeamId: "t1",
      redTeamId: "gen",
      blueAliases: ["T1"],
      redAliases: ["GEN"],
      startsAt: new Date("2026-06-14T08:00:00Z"),
    });
    assert.equal(
      pickMatchForVod("김민교 LCK T1 vs GEN Road to MSI #LckWatchParty", new Date("2026-06-14T10:00:00Z"), [lck, msi])?.id,
      "lck-t1-gen",
    );
  });
});

describe("pickMatchesForVodWithLiveTitles", () => {
  const genKt = match({
    id: "lck-gen-kt",
    tournament: "LCK",
    blueTeamId: "gen",
    redTeamId: "kt",
    blueAliases: ["GEN", "Gen.G"],
    redAliases: ["KT", "KT Rolster"],
    startsAt: new Date("2026-09-01T08:00:00Z"),
    bestOf: 5,
    status: "ended",
  });

  it("does not attach a current stream VOD while the official match is still live", () => {
    const liveMatch = { ...genKt, status: "live" as const };
    const hits = pickMatchesForVodWithLiveTitles(
      { title: "울챔스 / GEN vs KT #LCKWatchParty", publishedAt: new Date("2026-09-01T07:15:00Z"), platform: "chzzk" },
      [
        {
          title: "울챔스 / GEN vs KT #LCKWatchParty",
          seenAt: new Date("2026-09-01T07:15:00Z"),
          matchId: liveMatch.id,
          platform: "chzzk",
        },
      ],
      [liveMatch],
    );
    assert.deepEqual(hits, []);
  });

  it("does not attach yesterday's Overwatch VOD because today's LCK title was seen", () => {
    const hits = pickMatchesForVodWithLiveTitles(
      { title: "갑자기 옵치내전이 하고싶네 ㅎ;", publishedAt: new Date("2026-08-31T14:31:00Z"), platform: "chzzk" },
      [{ title: "울챔스 / GEN vs KT #LCKWatchParty", seenAt: new Date("2026-09-01T07:15:00Z"), matchId: genKt.id, platform: "chzzk" }],
      [genKt],
    );
    assert.deepEqual(hits, []);
  });

  it("still attaches a retitled 다시보기 from the same LCK session", () => {
    const hits = pickMatchesForVodWithLiveTitles(
      { title: "다시보기", publishedAt: new Date("2026-09-01T07:00:00Z"), platform: "chzzk" },
      [
        {
          title: "울챔스 / GEN vs KT #LCKWatchParty",
          seenAt: new Date("2026-09-01T07:15:00Z"),
          matchId: genKt.id,
          platform: "chzzk",
        },
      ],
      [genKt],
    );
    assert.deepEqual(
      hits.map((row) => row.id),
      ["lck-gen-kt"],
    );
  });

  it("does not glue FC Online / variety VODs onto an LCK match via live titles", () => {
    const dkKt = match({
      id: "lck-kt-dk",
      tournament: "LCK",
      blueTeamId: "kt",
      redTeamId: "dk",
      blueAliases: ["KT", "KT Rolster"],
      redAliases: ["DK", "Dplus"],
      startsAt: new Date("2026-08-30T08:00:00Z"),
      bestOf: 5,
    });
    const hits = pickMatchesForVodWithLiveTitles(
      { title: "이상호 새벽 FC온라인 공차기", publishedAt: new Date("2026-08-30T14:00:00Z"), platform: "chzzk" },
      [
        {
          title: "이상호 DK vs KT #LckWatchParty",
          seenAt: new Date("2026-08-30T08:30:00Z"),
          matchId: dkKt.id,
          platform: "chzzk",
        },
      ],
      [dkKt],
    );
    assert.deepEqual(hits, []);
  });

  it("does not glue a solo-queue SOOP VOD onto GEN vs KT via live titles", () => {
    const po = match({
      id: "lck-gen-kt-po",
      tournament: "LCK",
      blueTeamId: "gen",
      redTeamId: "kt",
      blueAliases: ["GEN", "Gen.G", "젠지"],
      redAliases: ["KT", "KT Rolster"],
      startsAt: new Date("2026-09-01T08:00:00Z"),
      bestOf: 5,
    });
    const hits = pickMatchesForVodWithLiveTitles(
      { title: "군이루 솔로랭크", publishedAt: new Date("2026-09-01T10:56:00Z"), platform: "soop" },
      [
        {
          title: "군이루 GEN vs KT #LckWatchParty",
          seenAt: new Date("2026-09-01T08:20:00Z"),
          matchId: po.id,
          platform: "soop",
        },
      ],
      [po],
    );
    assert.deepEqual(hits, []);
  });

  it("does not park a GEN vs KT VOD on yesterday's DK vs KT because today's series is still live", () => {
    const dkKt = match({
      id: "lck-kt-dk",
      tournament: "LCK",
      blueTeamId: "kt",
      redTeamId: "dk",
      blueAliases: ["KT"],
      redAliases: ["DK"],
      startsAt: new Date("2026-08-30T08:00:00Z"),
      bestOf: 5,
    });
    const liveGenKt = { ...genKt, status: "live" as const };
    const hits = pickMatchesForVodWithLiveTitles(
      {
        title: "✨ LCK GEN vs KT 강팀 대전이 재밌어 #LCKWatchPArty",
        publishedAt: new Date("2026-09-01T07:00:00Z"),
        platform: "chzzk",
      },
      [],
      [dkKt, liveGenKt],
    );
    assert.deepEqual(hits, []);
  });

  it("does not reuse a Chzzk live title on a YouTube VOD", () => {
    const hits = pickMatchesForVodWithLiveTitles(
      { title: "궁대박", publishedAt: new Date("2026-09-01T08:00:12Z"), platform: "youtube" },
      [
        {
          title: "울챔스 / GEN vs KT #LCKWatchParty",
          seenAt: new Date("2026-09-01T07:45:00Z"),
          matchId: genKt.id,
          platform: "chzzk",
        },
      ],
      [genKt],
    );
    assert.deepEqual(hits, []);
  });
});

describe("storedVodIsUnrelatedToMatch", () => {
  it("drops a solo-queue VOD parked on GEN vs KT", () => {
    assert.equal(
      storedVodIsUnrelatedToMatch("군이루 솔로랭크", {
        blueAliases: ["GEN", "젠지"],
        redAliases: ["KT"],
      }),
      true,
    );
  });

  it("keeps a GEN vs KT watchparty VOD", () => {
    assert.equal(
      storedVodIsUnrelatedToMatch("김민교x칸 LCK GEN vs KT 플레이오프 #LckWatchParty", {
        blueAliases: ["GEN", "젠지"],
        redAliases: ["KT"],
      }),
      false,
    );
  });
});
