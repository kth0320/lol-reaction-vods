"use client";

import { MatchTeams } from "@/components/match-teams";
import { parseVodFilter, vodHubPath, vodMatchPath } from "@/lib/vod-filter";
import type { VodHubId } from "@/lib/vod-hub";
import { ALL_STAGE_ID, filterMatchesByStage, hubStageHeading, hubStageOptions } from "@/lib/vod-split";
import { filterMatchesBySeason, pastYearEmptyMessage, vodYearOptionLabel, type VodYearFilter } from "@/lib/vod-season";
import { filterVodMatches } from "@/lib/vod-search";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type VodMatchRow = {
  id: string;
  tournament: string;
  split: string;
  bestOf: number;
  startsAtLabel: string;
  startsAtIso: string;
  seasonYear: number;
  blueAbbr: string;
  blueName: string;
  blueImageUrl: string;
  redAbbr: string;
  redName: string;
  redImageUrl: string;
  reactionCount: number;
  blue: { abbr: string; name: string; aliases: string[] };
  red: { abbr: string; name: string; aliases: string[] };
};

export function VodMatchList({
  matches,
  hubId,
  searchExample = "KT",
  emptyMessage = "아직 이 대회 다시보기가 없습니다. YouTube 수집이 붙으면 여기에 쌓입니다.",
  yearFilter,
  initialYear,
  initialStage,
  initialQuery,
}: {
  matches: VodMatchRow[];
  hubId: VodHubId;
  searchExample?: string;
  emptyMessage?: string;
  yearFilter?: VodYearFilter;
  initialYear?: number;
  initialStage?: string;
  initialQuery?: string;
}) {
  const years = yearFilter?.years ?? [];
  const showYears = years.length > 0;
  const parsed = parseVodFilter(
    {
      year: initialYear ? String(initialYear) : undefined,
      stage: initialStage,
      q: initialQuery,
    },
    years,
    hubId,
  );
  const [query, setQuery] = useState(parsed.q);
  const [year, setYear] = useState(parsed.year || years[0] || 0);
  const [stage, setStage] = useState(parsed.stage);
  const stages = hubStageOptions(hubId, year);
  const kind = yearFilter?.kind ?? "season";

  useEffect(() => {
    const options = hubStageOptions(hubId, year);
    if (!options.some((option) => option.id === stage)) {
      setStage(ALL_STAGE_ID);
    }
  }, [hubId, year, stage]);

  useEffect(() => {
    window.history.replaceState(null, "", vodHubPath(hubId, year, stage, query));
  }, [hubId, year, stage, query]);

  const inYear = useMemo(
    () => (showYears ? filterMatchesBySeason(matches, year) : matches),
    [matches, year, showYears],
  );
  const dated = useMemo(
    () => inYear.map((row) => ({ ...row, startsAt: new Date(row.startsAtIso) })),
    [inYear],
  );
  const inStage = useMemo(() => filterMatchesByStage(dated, hubId, stage), [dated, hubId, stage]);
  const visible = useMemo(() => filterVodMatches(inStage, query), [inStage, query]);
  const searching = query.trim().length > 0;
  const pastYear = showYears && year !== years[0];
  const stageLabel = stages.find((option) => option.id === stage)?.label ?? "";

  return (
    <div className="vod-match-list">
      <div className="vod-toolbar">
        {showYears && yearFilter ? (
          <label className="vod-season">
            <span className="vod-search-label">{yearFilter.heading}</span>
            <select
              className="vod-season-select"
              value={year}
              onChange={(event) => {
                setYear(Number(event.target.value));
                setStage(ALL_STAGE_ID);
              }}
            >
              {years.map((optionYear) => (
                <option key={optionYear} value={optionYear}>
                  {vodYearOptionLabel(optionYear, kind)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="vod-season vod-stage">
          <span className="vod-search-label">{hubStageHeading(hubId)}</span>
          <select
            className="vod-season-select"
            value={stage}
            onChange={(event) => setStage(event.target.value)}
          >
            {stages.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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
            : pastYear && inYear.length === 0
              ? pastYearEmptyMessage(year, kind)
              : stage !== ALL_STAGE_ID
                ? `${stageLabel} 경기가 아직 없습니다. 해당 구간 영상을 넣으면 여기에 쌓입니다.`
                : emptyMessage}
        </p>
      ) : (
        <div className="match-list">
          {visible.map((match) => (
            <Link key={match.id} href={vodMatchPath(match.id, hubId, year, stage)} className="match-card">
              <div className="match-meta">
                <span>
                  {match.tournament} {match.split}
                </span>
                <span>BO{match.bestOf}</span>
                <span>{match.startsAtLabel}</span>
              </div>
              <MatchTeams
                blueAbbr={match.blueAbbr}
                redAbbr={match.redAbbr}
                blueImageUrl={match.blueImageUrl}
                redImageUrl={match.redImageUrl}
              />
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
