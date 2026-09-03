import { after } from "next/server";

const vodKick = globalThis as unknown as {
  vodPollStarted?: boolean;
  vodPollTimer?: ReturnType<typeof setInterval>;
};

export function kickLiveIngestAfterResponse() {
  after(() => {
    void import("@/lib/ingest/poll-live").then((mod) => mod.refreshLiveCandidatesInBackground());
  });
}

const VOD_INGEST_START_DELAY_MS = 2 * 60 * 1000;

/**
 * Replay ingest on a timer instead of once per navigation, so browsing does not
 * queue another SQLite writer. The poll itself only looks at matches that ended
 * in the last 24h, and skips entirely while a series is on air.
 */
export function kickVodIngestHalfHourly() {
  after(() => {
    if (vodKick.vodPollStarted) return;
    vodKick.vodPollStarted = true;
    void import("@/lib/ingest/poll-vods").then((mod) => {
      const run = () => void mod.refreshVodsInBackground(0);
      setTimeout(() => {
        run();
        if (vodKick.vodPollTimer) return;
        vodKick.vodPollTimer = setInterval(run, mod.VOD_POLL_INTERVAL_MS);
      }, VOD_INGEST_START_DELAY_MS);
    });
  });
}
