import { readFileSync } from "node:fs";
import { join } from "node:path";

export const PROTOTYPE_LEAGUE = "LEC";

export type CreatorWhitelistRow = {
  id: string;
  name: string;
  kind: string;
  ingestEnabled?: boolean;
  defaultSupportingTeamId?: string | null;
  note?: string;
};

export type CreatorChannelRow = {
  creatorId: string;
  platform: string;
  channelId: string;
  url: string;
};

export function readCreatorWhitelist(root = process.cwd()): CreatorWhitelistRow[] {
  return JSON.parse(readFileSync(join(root, "data", "creators", "whitelist.json"), "utf8")) as CreatorWhitelistRow[];
}

export function readCreatorChannels(root = process.cwd()): CreatorChannelRow[] {
  return JSON.parse(readFileSync(join(root, "data", "creators", "channels.json"), "utf8")) as CreatorChannelRow[];
}

export function prototypeIngestCreators(
  creators: CreatorWhitelistRow[] = readCreatorWhitelist(),
): CreatorWhitelistRow[] {
  return creators.filter((creator) => creator.ingestEnabled);
}

export function prototypeIngestChannels(
  creators: CreatorWhitelistRow[] = readCreatorWhitelist(),
  channels: CreatorChannelRow[] = readCreatorChannels(),
): CreatorChannelRow[] {
  const ingestIds = new Set(prototypeIngestCreators(creators).map((creator) => creator.id));
  return channels.filter((channel) => ingestIds.has(channel.creatorId));
}
