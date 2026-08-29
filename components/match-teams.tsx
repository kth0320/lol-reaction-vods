export function MatchTeams({
  blueAbbr,
  redAbbr,
  blueImageUrl,
  redImageUrl,
}: {
  blueAbbr: string;
  redAbbr: string;
  blueImageUrl?: string | null;
  redImageUrl?: string | null;
}) {
  return (
    <div className="match-teams">
      <MatchTeam abbr={blueAbbr} imageUrl={blueImageUrl} />
      <span className="vs">VS</span>
      <MatchTeam abbr={redAbbr} imageUrl={redImageUrl} right />
    </div>
  );
}

function MatchTeam({
  abbr,
  imageUrl,
  right = false,
}: {
  abbr: string;
  imageUrl?: string | null;
  right?: boolean;
}) {
  return (
    <div className={`match-team${right ? " right" : ""}`}>
      {imageUrl ? <img className="match-logo" src={imageUrl} alt="" /> : <span className="match-logo match-logo-empty" />}
      <p className="team-name">{abbr}</p>
    </div>
  );
}
