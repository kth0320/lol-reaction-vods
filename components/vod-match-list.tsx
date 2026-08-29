"use client";

import { filterVodMatches } from "@/lib/vod-search";
import Link from "next/link";
import { useMemo, useState } from "react";

export type VodMatchRow = {
  id: string;
  tournament: string;
  split: string;
  bestOf: number;
  startsAtLabel: string;
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
}: {
  matches: VodMatchRow[];
  searchExample?: string;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => filterVodMatches(matches, query), [matches, query]);
  const searching = query.trim().length > 0;

  return (
    <div className="vod-match-list">
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
      {visible.length === 0 ? (
        <p className="empty">
          {searching ? `"${query.trim()}"와 맞는 경기가 없습니다.` : emptyMessage}
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
