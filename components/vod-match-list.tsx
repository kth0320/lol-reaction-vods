"use client";

import { filterMatchesBySeason, pastYearEmptyMessage, vodYearOptionLabel, type VodYearFilter } from "@/lib/vod-season";
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
  yearFilter,
}: {
  matches: VodMatchRow[];
  searchExample?: string;
  emptyMessage?: string;
  yearFilter?: VodYearFilter;
}) {
  const years = yearFilter?.years ?? [];
  const showYears = years.length > 0;
  const [query, setQuery] = useState("");
  const [year, setYear] = useState(years[0] ?? 0);
  const inYear = useMemo(
    () => (showYears ? filterMatchesBySeason(matches, year) : matches),
    [matches, year, showYears],
  );
  const visible = useMemo(() => filterVodMatches(inYear, query), [inYear, query]);
  const searching = query.trim().length > 0;
  const pastYear = showYears && year !== years[0];
  const kind = yearFilter?.kind ?? "season";

  return (
    <div className="vod-match-list">
      <div className="vod-toolbar">
        {showYears && yearFilter ? (
          <label className="vod-season">
            <span className="vod-search-label">{yearFilter.heading}</span>
            <select
              className="vod-season-select"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((optionYear) => (
                <option key={optionYear} value={optionYear}>
                  {vodYearOptionLabel(optionYear, kind)}
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
            : pastYear
              ? pastYearEmptyMessage(year, kind)
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
