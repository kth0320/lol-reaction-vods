import type { PrototypeLiveLeague } from "@/lib/leagues";

export type UpcomingSlot = {
  league: PrototypeLiveLeague;
  matchId: string | null;
  startsAtLabel: string | null;
  blueAbbr: string;
  redAbbr: string;
  blueImageUrl: string;
  redImageUrl: string;
  leagueImageUrl: string;
};

function TeamMark({ abbr, imageUrl }: { abbr: string; imageUrl: string }) {
  return (
    <div className="upcoming-team">
      {imageUrl ? <img className="upcoming-logo" src={imageUrl} alt="" /> : <span className="upcoming-logo empty" />}
      <span className="upcoming-abbr">{abbr}</span>
    </div>
  );
}

export function UpcomingBoard({ slots }: { slots: UpcomingSlot[] }) {
  return (
    <section className="live-hub">
      <div className="live-hub-head">
        <h2 className="section-title">다음 경기</h2>
      </div>
      <div className="upcoming-card">
        <p className="upcoming-kicker">지금은 생중계 중인 LCK · LPL · LEC 경기가 없습니다.</p>
        <div className="upcoming-rows">
          {slots.map((slot) => (
            <div key={slot.league} className="upcoming-row">
              <p className="upcoming-league">{slot.league}</p>
              {slot.matchId ? (
                <>
                  <div className="upcoming-matchup">
                    <TeamMark abbr={slot.blueAbbr} imageUrl={slot.blueImageUrl} />
                    <span className="upcoming-vs">vs</span>
                    <TeamMark abbr={slot.redAbbr} imageUrl={slot.redImageUrl} />
                  </div>
                  <p className="upcoming-time">{slot.startsAtLabel}</p>
                </>
              ) : (
                <p className="upcoming-empty">다음 일정이 없습니다.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
