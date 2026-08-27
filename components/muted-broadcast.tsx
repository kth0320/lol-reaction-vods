"use client";

import { useEffect, useState } from "react";
import { mutedBroadcastSrc, type BackgroundBroadcast } from "@/lib/ingest/official-stream";

export function MutedBroadcast({ broadcast }: { broadcast: BackgroundBroadcast }) {
  const [parent, setParent] = useState("");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setParent(window.location.hostname);
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  if (reduceMotion) return null;
  if (broadcast.provider === "twitch" && !parent) return null;

  const src = mutedBroadcastSrc(broadcast, parent || "localhost");

  return (
    <div className="vs-card-media" aria-hidden="true">
      <iframe
        src={src}
        title=""
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen={false}
        tabIndex={-1}
      />
    </div>
  );
}
