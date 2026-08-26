"use client";

import { useMemo, useState, type ReactNode } from "react";
import { VodPlayer } from "@/components/vod-player";
import { creatorKindLabel, isPlatform, platformLabel, type Platform } from "@/lib/playback";
import { filterLiveCasts, supportLabel, type PlatformFilter, type TeamFilter } from "@/lib/live-filters";

export type LiveCasterView = {
  id: string;
  creatorName: string;
  creatorKind: string;
  platform: string;
  title: string;
  url: string;
  externalId: string;
  supportingTeamId: string | null;
  supportingTeamAbbr: string | null;
};

export function LiveCasterBoard({
  blue,
  red,
  casts,
}: {
  blue: { id: string; abbr: string };
  red: { id: string; abbr: string };
  casts: LiveCasterView[];
}) {
  const [team, setTeam] = useState<TeamFilter>("all");
  const [platform, setPlatform] = useState<PlatformFilter>("all");

  const visible = useMemo(() => filterLiveCasts(casts, team, platform), [casts, team, platform]);
  const platforms = Array.from(new Set(casts.map((cast) => cast.platform)));

  return (
    <section className="live-board">
      <h2 className="section-title">지금 중계 중인 방송인</h2>
      <div className="filter-row">
        <span className="filter-label">응원 팀</span>
        <FilterChip selected={team === "all"} onClick={() => setTeam("all")}>
          전체
        </FilterChip>
        <FilterChip selected={team === blue.id} onClick={() => setTeam(blue.id)}>
          {blue.abbr}
        </FilterChip>
        <FilterChip selected={team === red.id} onClick={() => setTeam(red.id)}>
          {red.abbr}
        </FilterChip>
        <FilterChip selected={team === "neutral"} onClick={() => setTeam("neutral")}>
          중립
        </FilterChip>
      </div>
      <div className="filter-row">
        <span className="filter-label">플랫폼</span>
        <FilterChip selected={platform === "all"} onClick={() => setPlatform("all")}>
          전체
        </FilterChip>
        {platforms.map((item) => (
          <FilterChip key={item} selected={platform === item} onClick={() => setPlatform(item)}>
            {isPlatform(item) ? platformLabel(item as Platform) : item}
          </FilterChip>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="empty">이 필터에 해당하는 생방송이 없습니다.</p>
      ) : (
        <div className="reaction-list">
          {visible.map((cast) => (
            <article key={cast.id} className="reaction-card">
              <div className="reaction-head">
                <div>
                  <h3 className="creator-name">{cast.creatorName}</h3>
                  <p className="creator-kind">
                    {creatorKindLabel(cast.creatorKind)} · {supportLabel(cast.supportingTeamAbbr)}
                  </p>
                </div>
                <span className="platform-badge">
                  {isPlatform(cast.platform) ? platformLabel(cast.platform) : cast.platform}
                </span>
              </div>
              <p className="reaction-title">{cast.title}</p>
              <VodPlayer platform={cast.platform} externalId={cast.externalId} url={cast.url} live />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`filter-chip${selected ? " selected" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}
