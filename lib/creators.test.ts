import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  prototypeIngestChannels,
  prototypeIngestCreators,
  readCreatorChannels,
  readCreatorWhitelist,
} from "./creators";

describe("prototype ingest whitelist", () => {
  it("enables the LEC prototype casters and not the Phase 1 LCK mocks", () => {
    const ingestIds = prototypeIngestCreators().map((creator) => creator.id).sort();
    assert.deepEqual(ingestIds, [
      "addung",
      "caedrel",
      "hunsuking",
      "ibai",
      "jankos",
      "kameto",
      "kangqui",
      "longdari",
      "obsess",
      "wadid",
      "wolf",
      "yamatocannon",
    ]);
    const names = readCreatorWhitelist().map((creator) => creator.id);
    assert.ok(names.includes("minkyo"));
    assert.ok(names.includes("untara"));
    assert.equal(
      prototypeIngestCreators().some((creator) => creator.id === "minkyo" || creator.id === "untara"),
      false,
    );
  });

  it("stores one live channel id per prototype caster", () => {
    const channels = prototypeIngestChannels();
    const byCreator = Object.fromEntries(channels.map((channel) => [channel.creatorId, channel]));
    assert.equal(channels.length, 12);
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
    assert.equal(readCreatorChannels().length, 12);
  });

  it("defaults team co-streamers to their LEC team and leaves slate casters unassigned", () => {
    const byId = Object.fromEntries(readCreatorWhitelist().map((creator) => [creator.id, creator]));
    assert.equal(byId.ibai.defaultSupportingTeamId, "koi");
    assert.equal(byId.obsess.defaultSupportingTeamId, "fnc");
    assert.equal(byId.kameto.defaultSupportingTeamId, "kc");
    assert.equal(byId.jankos.defaultSupportingTeamId, "g2");
    assert.equal(byId.wadid.defaultSupportingTeamId, "g2");
    assert.equal(byId.yamatocannon.defaultSupportingTeamId, "sk");
    assert.equal(byId.caedrel.defaultSupportingTeamId, undefined);
    assert.equal(byId.wolf.defaultSupportingTeamId, undefined);
  });
});
