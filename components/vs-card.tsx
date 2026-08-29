"use client";

import Link from "next/link";
import { MutedBroadcast } from "@/components/muted-broadcast";
import type { BackgroundBroadcast } from "@/lib/ingest/official-stream";
import { hasMatchupPlate } from "@/lib/league-art";
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
  leagueImageUrl?: string;
  broadcast?: BackgroundBroadcast | null;
};

function MatchupTeam({
  abbr,
  name,
  imageUrl,
}: {
  abbr: string;
  name: string;
  imageUrl?: string;
}) {
  return (
    <div className="vs-matchup-team">
      {imageUrl ? <img className="vs-logo" src={imageUrl} alt="" /> : <span className="vs-logo vs-logo-empty" />}
      <div>
        <p className="vs-abbr">{abbr}</p>
        <p className="vs-full">{name}</p>
      </div>
    </div>
  );
}

export function VsCard({ slide, href }: { slide: LiveSlide; href?: string }) {
  const plate = hasMatchupPlate(slide);
  const showBroadcast = Boolean(slide.broadcast) && !plate;
  const className = `vs-card league-${slide.tournament.toLowerCase()}${showBroadcast ? " has-broadcast" : ""}${plate ? " has-plate" : ""}`;
  const overlay = (
    <>
      {slide.leagueImageUrl ? (
        <img className="vs-league-mark" src={slide.leagueImageUrl} alt="" />
      ) : null}
      <div className="vs-card-top">
        <span className="live-dot">생중계</span>
      </div>
      <div className="vs-matchup">
        <MatchupTeam abbr={slide.blueAbbr} name={slide.blueName} imageUrl={slide.blueImageUrl} />
        <p className="vs-wordmark">VS</p>
        <MatchupTeam abbr={slide.redAbbr} name={slide.redName} imageUrl={slide.redImageUrl} />
      </div>
      <p className="vs-meta">
        {slide.tournament} · {slide.split} · BO{slide.bestOf}
        <span className="vs-time">{slide.startsAtLabel}</span>
      </p>
    </>
  );

  return (
    <div className={className}>
      {href ? (
        <Link href={href} className="vs-card-overlay">
          {overlay}
        </Link>
      ) : (
        <div className="vs-card-overlay">{overlay}</div>
      )}
      {showBroadcast ? <MutedBroadcast broadcast={slide.broadcast!} /> : null}
    </div>
  );
}
