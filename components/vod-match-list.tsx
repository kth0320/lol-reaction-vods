"use client";

import { filterMatchesBySeason, seasonLabel } from "@/lib/vod-season";
import { filterVodMatches } from "@/lib/vod-search";
import Link from "next/link";
import { useMemo, useState } from "react";

export type VodMatchRow = {
  id: string;
  tournament: string;
  split: string;
  bestOf: number;
  startsAtLabel: string;
  seasonYear: number;
  blueAbbr: string;
  blueName: string;
  redAbbr: string;
  redName: string;
  reactionCount: number;
  blue: { abbr: string; name: string; aliases: string[] };
  red: { abbr: string; name: string; aliases: string[] };
};

export function VodMatchList({
  matches,
  searchExample = "KT",
  emptyMessage = "아직 이 대회 다시보기가 없습니다. YouTube 수집이 붙으면 여기에 쌓입니다.",
  seasons,
}: {
  matches: VodMatchRow[];
  searchExample?: string;
  emptyMessage?: string;
  seasons?: number[];
}) {
  const showSeasons = Boolean(seasons && seasons.length > 0);
  const [query, setQuery] = useState("");
  const [season, setSeason] = useState(seasons?.[0] ?? 0);
  const inSeason = useMemo(
    () => (showSeasons ? filterMatchesBySeason(matches, season) : matches),
    [matches, season, showSeasons],
  );
  const visible = useMemo(() => filterVodMatches(inSeason, query), [inSeason, query]);
  const searching = query.trim().length > 0;
  const pastSeason = showSeasons && season !== seasons?.[0];

  return (
    <div className="vod-match-list">
      <div className="vod-toolbar">
        {showSeasons ? (
          <label className="vod-season">
            <span className="vod-search-label">시즌</span>
            <select
              className="vod-season-select"
              value={season}
              onChange={(event) => setSeason(Number(event.target.value))}
            >
              {seasons?.map((year) => (
                <option key={year} value={year}>
                  {seasonLabel(year)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="vod-search">
          <span className="vod-search-label">검색</span>
          <input
            type="search"
            className="vod-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`팀 이름 · 약자  예: ${searchExample}`}
            autoComplete="off"
          />
        </label>
      </div>
      {visible.length === 0 ? (
        <p className="empty">
          {searching
            ? `"${query.trim()}"와 맞는 경기가 없습니다.`
            : pastSeason
              ? `${seasonLabel(season)} 다시보기는 아직 없습니다. 지난 시즌 영상을 넣으면 여기에 쌓입니다.`
              : emptyMessage}
        </p>
      ) : (
        <div className="match-list">
          {visible.map((match) => (
            <Link key={match.id} href={`/matches/${match.id}`} className="match-card">
              <div className="match-meta">
                <span>
                  {match.tournament} {match.split}
                </span>
                <span>BO{match.bestOf}</span>
                <span>{match.startsAtLabel}</span>
              </div>
              <div className="match-teams">
                <p className="team-name">{match.blueAbbr}</p>
                <span className="vs">VS</span>
                <p className="team-name right">{match.redAbbr}</p>
              </div>
              <div className="match-meta">
                <span>
                  {match.blueName} vs {match.redName}
                </span>
                <span className="reaction-count">리액션 {match.reactionCount}개</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
