import { syncOfficialSchedule } from "../lib/ingest/sync-schedule";

async function main() {
  const mapped = await syncOfficialSchedule();
  const live = mapped.filter((match) => match.status === "live");
  const upcoming = mapped.filter((match) => match.status === "upcoming");
  console.log(`schedule ${mapped.length} matches, ${live.length} live, ${upcoming.length} upcoming`);
  for (const match of [...live, ...upcoming.slice(0, 8)]) {
    console.log(`${match.status.padEnd(8)} ${match.league} ${match.split} ${match.blueTeamId} vs ${match.redTeamId} ${match.startsAt.toISOString()} ${match.id}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
