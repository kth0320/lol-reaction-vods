import { pollReactionVods } from "../lib/ingest/poll-vods";

async function main() {
  const summary = await pollReactionVods({ maxAgeMs: null });
  console.log(
    `scanned ${summary.scanned} vods, attached ${summary.attached}, skipped twitch channels ${summary.skippedTwitch}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
