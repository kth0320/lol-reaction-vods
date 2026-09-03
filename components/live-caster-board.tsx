"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CasterAvatar } from "@/components/caster-avatar";
import { PlatformMark } from "@/components/platform-mark";
import { formatViewers } from "@/lib/format";
import { isPlatform, platformLabel, type Platform } from "@/lib/playback";
import { filterLiveCasts, type PlatformFilter } from "@/lib/live-filters";

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

export function LiveCasterBoard({ casts }: { casts: LiveCasterView[] }) {
  const [platform, setPlatform] = useState<PlatformFilter>("all");

  const visible = useMemo(() => {
    return filterLiveCasts(casts, platform).slice().sort((a, b) => (b.viewerCount ?? -1) - (a.viewerCount ?? -1));
  }, [casts, platform]);
  const platforms = Array.from(new Set(filterLiveCasts(casts, "all").map((cast) => cast.platform)));

  return (
    <section className="live-board">
      <h2 className="section-title">지금 중계 중인 방송인</h2>
      <p className="page-lead">로고를 누르면 원본 방송으로 이동합니다.</p>
      <div className="filter-row">
        <span className="filter-label">플랫폼</span>
        <FilterChip selected={platform === "all"} onClick={() => setPlatform("all")} ariaLabel="전체">
          전체
        </FilterChip>
        {platforms.map((item) => {
          const name = isPlatform(item) ? platformLabel(item as Platform) : item;
          return (
            <FilterChip key={item} selected={platform === item} onClick={() => setPlatform(item)} ariaLabel={name}>
              <PlatformMark platform={item} className="filter-platform-mark" />
            </FilterChip>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <p className="empty">이 필터에 해당하는 생방송이 없습니다.</p>
      ) : (
        <div className="caster-list">
          {visible.map((cast) => {
            const name = isPlatform(cast.platform) ? platformLabel(cast.platform) : cast.platform;
            return (
              <a key={cast.id} className="caster-row" href={cast.url} target="_blank" rel="noreferrer">
                <CasterAvatar name={cast.creatorName} src={cast.imageUrl} />
                <div className="caster-copy">
                  <p className="creator-name">{cast.creatorName}</p>
                  <p className="caster-viewers">시청자 {formatViewers(cast.viewerCount)}</p>
                </div>
                <span className="caster-platform" title={name} aria-label={name}>
                  <PlatformMark platform={cast.platform} />
                </span>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FilterChip({
  selected,
  onClick,
  ariaLabel,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`filter-chip${selected ? " selected" : ""}`}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      title={ariaLabel}
    >
      {children}
    </button>
  );
}
