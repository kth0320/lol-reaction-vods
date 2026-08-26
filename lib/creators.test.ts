import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  prototypeIngestChannels,
  prototypeIngestCreators,
  readCreatorChannels,
  readCreatorWhitelist,
} from "./creators";

describe("prototype ingest whitelist", () => {
  it("enables about 20 LCK and LEC casters including the Phase 1 LCK names", () => {
    const ingestIds = prototypeIngestCreators().map((creator) => creator.id).sort();
    assert.equal(ingestIds.length, 20);
    for (const id of ["minkyo", "untara", "goemuljwi", "ralo", "ambition", "ddahyoni", "poongwolyang", "runner", "wadid", "caedrel"]) {
      assert.ok(ingestIds.includes(id), id);
    }
    const names = readCreatorWhitelist().map((creator) => creator.id);
    assert.equal(names.length, 20);
  });

  it("stores one live channel id per prototype caster", () => {
    const channels = prototypeIngestChannels();
    const byCreator = Object.fromEntries(channels.map((channel) => [channel.creatorId, channel]));
    assert.equal(channels.length, 20);
    assert.equal(readCreatorChannels().length, 20);
    assert.equal(byCreator.minkyo.platform, "soop");
    assert.equal(byCreator.minkyo.channelId, "phonics1");
    assert.equal(byCreator.untara.platform, "chzzk");
    assert.equal(byCreator.untara.channelId, "aedecd121e2cf471fd8510f980cac8b1");
    assert.equal(byCreator.goemuljwi.channelId, "c7ded8ea6b0605d3c78e18650d2df83b");
    assert.equal(byCreator.ralo.channelId, "3497a9a7221cc3ee5d3f95991d9f95e9");
    assert.equal(byCreator.ambition.channelId, "8a59b34b46271960c1bf172bb0fac758");
    assert.equal(byCreator.ddahyoni.channelId, "0dad8baf12a436f722faa8e5001c5011");
    assert.equal(byCreator.poongwolyang.channelId, "7ce8032370ac5121dcabce7bad375ced");
    assert.equal(byCreator.runner.channelId, "19e3b97ca1bca954d1ac84cf6862e0dc");
    assert.equal(byCreator.wadid.platform, "chzzk");
    assert.equal(byCreator.wadid.channelId, "bad6d7da33aec001343a51b85a70fcdb");
    assert.equal(byCreator.wolf.channelId, "0b33823ac81de48d5b78a38cdbc0ab94");
    assert.equal(byCreator.kangqui.channelId, "1a1dd9ce56fb61a37ffb6f69f6d5b978");
    assert.equal(byCreator.longdari.platform, "soop");
    assert.equal(byCreator.longdari.channelId, "ksh0162");
    assert.equal(byCreator.hunsuking.channelId, "ehdrb866");
    assert.equal(byCreator.addung.channelId, "gjstn7637");
    assert.equal(byCreator.caedrel.platform, "twitch");
    assert.equal(byCreator.caedrel.channelId, "caedrel");
    assert.equal(byCreator.jankos.channelId, "jankos");
    assert.equal(byCreator.yamatocannon.channelId, "yamatocannon");
    assert.equal(byCreator.kameto.channelId, "kamet0");
    assert.equal(byCreator.ibai.channelId, "ibai");
    assert.equal(byCreator.obsess.channelId, "obsess3");
  });

  it("defaults team co-streamers to their LCK/LEC team and leaves slate casters unassigned", () => {
    const byId = Object.fromEntries(readCreatorWhitelist().map((creator) => [creator.id, creator]));
    assert.equal(byId.untara.defaultSupportingTeamId, "t1");
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
