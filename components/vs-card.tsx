"use client";

import Link from "next/link";
import { MutedBroadcast } from "@/components/muted-broadcast";
import type { BackgroundBroadcast } from "@/lib/ingest/official-stream";
import { hasMatchupPlate } from "@/lib/league-art";
import type { LiveHubKind } from "@/lib/live-hub";
import { liveHubBadge } from "@/lib/live-hub";
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
  kind?: LiveHubKind;
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
  const kind = slide.kind ?? "live";
  const plate = kind !== "empty" && hasMatchupPlate(slide);
  const showBroadcast = kind === "live" && Boolean(slide.broadcast) && !plate;
  const badge = liveHubBadge(kind);
  const className = `vs-card league-${slide.tournament.toLowerCase()}${showBroadcast ? " has-broadcast" : ""}${plate ? " has-plate" : ""}${href ? "" : " is-static"}`;
  const overlay = (
    <>
      {slide.leagueImageUrl ? (
        <img className="vs-league-mark" src={slide.leagueImageUrl} alt="" />
      ) : null}
      <div className="vs-card-top">
        {badge ? <span className={`live-dot${kind === "upcoming" ? " soon" : ""}`}>{badge}</span> : null}
      </div>
      {kind === "empty" ? (
        <p className="vs-empty">다음 일정이 없습니다.</p>
      ) : (
        <>
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
      )}
    </>
  );

  return (
    <div className={className}>
      {href ? (
        <Link href={href} prefetch={false} className="vs-card-overlay">
          {overlay}
        </Link>
      ) : (
        <div className="vs-card-overlay">{overlay}</div>
      )}
      {showBroadcast ? <MutedBroadcast broadcast={slide.broadcast!} /> : null}
    </div>
  );
}
