import { pollLiveCandidates } from "../lib/ingest/poll-live";

async function main() {
  const rows = await pollLiveCandidates();
  const live = rows.filter((row) => row.isLive);
  console.log(`polled ${rows.length} channels, ${live.length} live`);
  for (const row of rows) {
    const state = row.error ? `ERR ${row.error}` : row.isLive ? "LIVE" : "off";
    const match = row.matchLabel ?? "no LEC match";
    console.log(`${row.creatorName.padEnd(14)} ${row.platform.padEnd(7)} ${state}  ${match}  ${row.title}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
