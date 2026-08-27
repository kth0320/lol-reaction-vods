import Link from "next/link";
import { VOD_HUB_INTERNATIONAL, VOD_HUB_LEAGUES, type VodHubId } from "@/lib/vod-hub";

export function VodHubGrid({ counts }: { counts: Record<VodHubId, number> }) {
  return (
    <div className="vod-hub">
      <div className="vod-hub-row international">
        {VOD_HUB_INTERNATIONAL.map((card) => (
          <HubCard key={card.id} id={card.id} label={card.label} count={counts[card.id]} />
        ))}
      </div>
      <div className="vod-hub-row leagues">
        {VOD_HUB_LEAGUES.map((card) => (
          <HubCard key={card.id} id={card.id} label={card.label} count={counts[card.id]} />
        ))}
      </div>
    </div>
  );
}

function HubCard({ id, label, count }: { id: VodHubId; label: string; count: number }) {
  return (
    <Link href={`/vods/${id}`} className="vod-hub-card">
      <p className="vod-hub-label">{label}</p>
      <p className="vod-hub-count">리액션 {count}개</p>
    </Link>
  );
}
