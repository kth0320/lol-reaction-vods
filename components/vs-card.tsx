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
  redAbbr: string;
  redName: string;
};

export function VsCard({ slide, href }: { slide: LiveSlide; href?: string }) {
  const inner = (
    <>
      <div className="vs-card-top">
        <span className="live-dot">LIVE</span>
        <span>{slide.tournament} 지금 생중계</span>
      </div>
      <div className="vs-card-body">
        <div>
          <p className="vs-abbr">{slide.blueAbbr}</p>
          <p className="vs-full">{slide.blueName}</p>
        </div>
        <div className="vs-mid">
          <span className="vs">VS</span>
          <span>
            {slide.tournament} {slide.split} · BO{slide.bestOf}
          </span>
        </div>
        <div className="vs-right">
          <p className="vs-abbr">{slide.redAbbr}</p>
          <p className="vs-full">{slide.redName}</p>
        </div>
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
