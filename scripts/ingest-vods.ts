import { pollReactionVods } from "../lib/ingest/poll-vods";
import { syncOfficialSchedule } from "../lib/ingest/sync-schedule";
import { VOD_ARCHIVE_MAX_PAGES } from "../lib/ingest/vod-list";
import { vodArchiveYears } from "../lib/vod-season";

async function main() {
  const archiveYears = vodArchiveYears();
  const untilYear = Math.min(...archiveYears);
  await syncOfficialSchedule({ archiveYears });
  const summary = await pollReactionVods({
    maxAgeMs: null,
    prune: false,
    vods: { maxPages: VOD_ARCHIVE_MAX_PAGES, untilYear },
  });
  console.log(
    `scanned ${summary.scanned} vods, attached ${summary.attached}, skipped twitch channels ${summary.skippedTwitch} (pages<=${VOD_ARCHIVE_MAX_PAGES}, until ${untilYear})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
