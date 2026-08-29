"use client";

import { useMemo, useState, type ReactNode } from "react";
import { VodPlayer } from "@/components/vod-player";
import { formatViewers } from "@/lib/format";
import { isPlatform, platformLabel, type Platform } from "@/lib/playback";
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
  imageUrl?: string;
  viewerCount?: number | null;
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
  const [picked, setPicked] = useState<string | null>(null);

  const visible = useMemo(() => {
    return filterLiveCasts(casts, team, platform).slice().sort((a, b) => (b.viewerCount ?? -1) - (a.viewerCount ?? -1));
  }, [casts, team, platform]);
  const platforms = Array.from(new Set(casts.map((cast) => cast.platform)));
  const active = visible.find((cast) => cast.id === picked) ?? visible[0] ?? null;

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
        <>
          {active ? (
            <div className="caster-player">
              <p className="caster-now">
                {active.creatorName} ·{" "}
                {isPlatform(active.platform) ? platformLabel(active.platform) : active.platform}
              </p>
              <VodPlayer
                platform={active.platform}
                externalId={active.externalId}
                url={active.url}
                live
              />
            </div>
          ) : null}
          <div className="caster-list">
            {visible.map((cast) => {
              const platformName = isPlatform(cast.platform) ? platformLabel(cast.platform) : cast.platform;
              const selected = active?.id === cast.id;
              return (
                <button
                  key={cast.id}
                  type="button"
                  className={`caster-row${selected ? " selected" : ""}`}
                  onClick={() => setPicked(cast.id)}
                  aria-pressed={selected}
                >
                  <CasterAvatar name={cast.creatorName} src={cast.imageUrl} />
                  <div className="caster-copy">
                    <p className="creator-name">{cast.creatorName}</p>
                    <p className="caster-meta">
                      {platformName} · {supportLabel(cast.supportingTeamAbbr)}
                    </p>
                    <p className="caster-viewers">시청자 {formatViewers(cast.viewerCount)}</p>
                  </div>
                  <span className="caster-chevron" aria-hidden>
                    {selected ? "●" : "›"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function CasterAvatar({ name, src }: { name: string; src?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="caster-avatar caster-avatar-fallback" aria-hidden>
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="caster-avatar"
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
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
