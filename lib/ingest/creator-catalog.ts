import { readCreatorChannels, readCreatorWhitelist } from "@/lib/creators";
import { prisma } from "@/lib/prisma";

export async function ensureCreatorCatalog(root = process.cwd()): Promise<void> {
  const creators = readCreatorWhitelist(root);
  const channels = readCreatorChannels(root);

  for (const creator of creators) {
    await prisma.creator.upsert({
      where: { id: creator.id },
      create: {
        id: creator.id,
        name: creator.name,
        kind: creator.kind,
        ingestEnabled: Boolean(creator.ingestEnabled),
        defaultSupportingTeamId: creator.defaultSupportingTeamId ?? null,
      },
      update: {
        name: creator.name,
        kind: creator.kind,
        ingestEnabled: Boolean(creator.ingestEnabled),
        defaultSupportingTeamId: creator.defaultSupportingTeamId ?? null,
      },
    });
  }

  for (const channel of channels) {
    await prisma.creatorChannel.upsert({
      where: { platform_channelId: { platform: channel.platform, channelId: channel.channelId } },
      create: {
        creatorId: channel.creatorId,
        platform: channel.platform,
        channelId: channel.channelId,
        url: channel.url,
      },
      update: {
        creatorId: channel.creatorId,
        url: channel.url,
      },
    });
  }
}
