import Link from "next/link";
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
};

function TeamSide({
  abbr,
  name,
  imageUrl,
  align,
}: {
  abbr: string;
  name: string;
  imageUrl?: string;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "vs-right" : undefined}>
      {imageUrl ? <img className="vs-logo" src={imageUrl} alt="" /> : null}
      <p className="vs-abbr">{abbr}</p>
      <p className="vs-full">{name}</p>
    </div>
  );
}

export function VsCard({ slide, href }: { slide: LiveSlide; href?: string }) {
  const inner = (
    <>
      <div className="vs-card-top">
        <span className="live-dot">LIVE</span>
        <span>{slide.tournament} 지금 생중계</span>
      </div>
      <div className="vs-card-body">
        <TeamSide abbr={slide.blueAbbr} name={slide.blueName} imageUrl={slide.blueImageUrl} align="left" />
        <div className="vs-mid">
          <span className="vs">VS</span>
          <span>
            {slide.tournament} {slide.split} · BO{slide.bestOf}
          </span>
        </div>
        <TeamSide abbr={slide.redAbbr} name={slide.redName} imageUrl={slide.redImageUrl} align="right" />
      </div>
      <p className="vs-time">{slide.startsAtLabel}</p>
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
