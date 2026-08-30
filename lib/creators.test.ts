import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prototypeIngestChannels, prototypeIngestCreators, readCreatorWhitelist } from "./creators";

const INGEST_IDS = [
  "addung",
  "beryl",
  "caedrel",
  "clid",
  "hunsuking",
  "ibai",
  "jankos",
  "kameto",
  "kangqui",
  "kimgoon",
  "longdari",
  "minkyo",
  "obsess",
  "sangho",
  "sooya",
  "tamtam",
  "untara",
  "wadid",
  "wolf",
  "yamatocannon",
];

describe("prototype ingest whitelist", () => {
  it("enables the manual LCK/LEC caster set and leaves rare tournament streamers off", () => {
    const ingestIds = prototypeIngestCreators().map((creator) => creator.id).sort();
    assert.deepEqual(ingestIds, INGEST_IDS);
    const byId = Object.fromEntries(readCreatorWhitelist().map((creator) => [creator.id, creator]));
    for (const id of ["goemuljwi", "ralo", "ambition", "ddahyoni", "poongwolyang", "runner"]) {
      assert.equal(byId[id].ingestEnabled, false, id);
    }
  });

  it("stores one live channel id per enabled prototype caster", () => {
    const channels = prototypeIngestChannels();
    const live = channels.filter((channel) => channel.platform !== "youtube");
    const youtube = channels.filter((channel) => channel.platform === "youtube");
    const byCreator = Object.fromEntries(live.map((channel) => [channel.creatorId, channel]));
    assert.equal(live.length, INGEST_IDS.length);
    assert.equal(byCreator.minkyo.platform, "soop");
    assert.equal(byCreator.minkyo.channelId, "phonics1");
    assert.equal(byCreator.clid.channelId, "xoals137");
    assert.equal(byCreator.sangho.channelId, "lshooooo");
    assert.equal(byCreator.kimgoon.channelId, "dkcjfhrm");
    assert.equal(byCreator.sooya.channelId, "tntntn13");
    assert.equal(byCreator.untara.platform, "chzzk");
    assert.equal(byCreator.untara.channelId, "aedecd121e2cf471fd8510f980cac8b1");
    assert.equal(byCreator.tamtam.channelId, "a7e175625fdea5a7d98428302b7aa57f");
    assert.equal(byCreator.beryl.channelId, "dab6c354212f9c54b1ed805d7d832ae6");
    assert.equal(byCreator.wadid.platform, "chzzk");
    assert.equal(byCreator.wadid.channelId, "bad6d7da33aec001343a51b85a70fcdb");
    assert.equal(byCreator.wolf.channelId, "0b33823ac81de48d5b78a38cdbc0ab94");
    assert.equal(byCreator.kangqui.channelId, "1a1dd9ce56fb61a37ffb6f69f6d5b978");
    assert.equal(byCreator.longdari.channelId, "ksh0162");
    assert.equal(byCreator.caedrel.platform, "twitch");
    assert.equal(byCreator.caedrel.channelId, "caedrel");
    assert.equal(byCreator.kameto.channelId, "kamet0");
    assert.equal(byCreator.obsess.channelId, "obsess3");
    assert.ok(youtube.every((channel) => channel.platform === "youtube"));
    assert.ok(youtube.some((channel) => channel.creatorId === "caedrel" && channel.channelId === "UCOFiUtKui6-x4T-J7_DgCag"));
    assert.ok(youtube.some((channel) => channel.creatorId === "wolf"));
    assert.ok(youtube.some((channel) => channel.creatorId === "jankos" && channel.channelId === "UCtp4K_YqcrbzjNH-tGi6gjQ"));
    assert.ok(youtube.some((channel) => channel.creatorId === "kameto" && channel.channelId === "UCApmTE4So9oX7sPkDGgSpFQ"));
    assert.ok(youtube.some((channel) => channel.creatorId === "obsess" && channel.channelId === "UC2nC3DnkGdTYdgF6Z5NGB-Q"));
  });

  it("defaults team co-streamers to their LCK/LEC team and leaves slate casters unassigned", () => {
    const byId = Object.fromEntries(readCreatorWhitelist().map((creator) => [creator.id, creator]));
    assert.equal(byId.untara.defaultSupportingTeamId, "t1");
    assert.equal(byId.sooya.defaultSupportingTeamId, "gen");
    assert.equal(byId.ibai.defaultSupportingTeamId, "koi");
    assert.equal(byId.obsess.defaultSupportingTeamId, "fnc");
    assert.equal(byId.kameto.defaultSupportingTeamId, "kc");
    assert.equal(byId.jankos.defaultSupportingTeamId, "g2");
    assert.equal(byId.wadid.defaultSupportingTeamId, "g2");
    assert.equal(byId.yamatocannon.defaultSupportingTeamId, "sk");
    assert.equal(byId.caedrel.defaultSupportingTeamId, undefined);
    assert.equal(byId.wolf.defaultSupportingTeamId, undefined);
    assert.equal(byId.minkyo.defaultSupportingTeamId, undefined);
  });
});
