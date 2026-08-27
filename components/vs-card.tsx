"use client";

import Link from "next/link";
import { MutedBroadcast } from "@/components/muted-broadcast";
import type { BackgroundBroadcast } from "@/lib/ingest/official-stream";
import type { League } from "@/lib/leagues";

export type LiveSlide = {
  id: string;
  tournament: League;
  split: string;
  bestOf: number;
  startsAtLabel: string;
  blueAbbr: string;
  blueName: string;
  blueImageUrl?: string;
  redAbbr: string;
  redName: string;
  redImageUrl?: string;
  broadcast?: BackgroundBroadcast | null;
};

function TeamRow({
  abbr,
  name,
  imageUrl,
}: {
  abbr: string;
  name: string;
  imageUrl?: string;
}) {
  return (
    <div className="vs-team-row">
      {imageUrl ? <img className="vs-logo" src={imageUrl} alt="" /> : <span className="vs-logo vs-logo-empty" />}
      <div>
        <p className="vs-abbr">{abbr}</p>
        <p className="vs-full">{name}</p>
      </div>
    </div>
  );
}

export function VsCard({ slide, href }: { slide: LiveSlide; href?: string }) {
  const inner = (
    <>
      {slide.broadcast ? <MutedBroadcast broadcast={slide.broadcast} /> : null}
      <div className="vs-card-overlay">
        <div className="vs-card-top">
          <span className="live-dot">생중계</span>
        </div>
        <div className="vs-teams-stack">
          <TeamRow abbr={slide.blueAbbr} name={slide.blueName} imageUrl={slide.blueImageUrl} />
          <TeamRow abbr={slide.redAbbr} name={slide.redName} imageUrl={slide.redImageUrl} />
        </div>
        <p className="vs-meta">
          {slide.tournament} · {slide.split} · BO{slide.bestOf}
          <span className="vs-time">{slide.startsAtLabel}</span>
        </p>
      </div>
    </>
  );

  if (!href) {
    return <div className={`vs-card league-${slide.tournament.toLowerCase()}`}>{inner}</div>;
  }

  return (
    <Link href={href} className={`vs-card league-${slide.tournament.toLowerCase()}`}>
      {inner}
    </Link>
  );
}
