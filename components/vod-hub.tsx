import Link from "next/link";
import { VOD_HUB_INTERNATIONAL, VOD_HUB_LEAGUES, type VodHubId, type VodHubStat } from "@/lib/vod-hub";

export function VodHubGrid({ stats }: { stats: Record<VodHubId, VodHubStat> }) {
  return (
    <div className="vod-hub">
      <div className="vod-hub-row international">
        {VOD_HUB_INTERNATIONAL.map((card) => (
          <HubCard key={card.id} id={card.id} label={card.label} stat={stats[card.id]} />
        ))}
      </div>
      <div className="vod-hub-row leagues">
        {VOD_HUB_LEAGUES.map((card) => (
          <HubCard key={card.id} id={card.id} label={card.label} stat={stats[card.id]} />
        ))}
      </div>
    </div>
  );
}

function HubCard({ id, label, stat }: { id: VodHubId; label: string; stat: VodHubStat }) {
  return (
    <Link href={`/vods/${id}`} className="vod-hub-card">
      <p className="vod-hub-label">{label}</p>
      <p className="vod-hub-count">
        경기 {stat.matchCount} · 리액션 {stat.reactionCount}
      </p>
    </Link>
  );
}
