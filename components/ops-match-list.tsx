"use client";

import type { OpsMatchDto } from "@/lib/dto";
import { VOD_HUB_CARDS } from "@/lib/vod-hub";
import Link from "next/link";
import { useEffect, useState } from "react";

export function OpsMatchList() {
  const [hub, setHub] = useState("");
  const [query, setQuery] = useState("");
  const [emptyOnly, setEmptyOnly] = useState(false);
  const [matches, setMatches] = useState<OpsMatchDto[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (hub) params.set("hub", hub);
    if (query.trim()) params.set("q", query.trim());
    if (emptyOnly) params.set("empty", "1");
    const timer = window.setTimeout(() => {
      void fetch(`/api/ops/matches?${params.toString()}`)
        .then(async (response) => {
          const body = (await response.json()) as { matches?: OpsMatchDto[]; error?: string };
          if (!response.ok) throw new Error(body.error || "조회 실패");
          setMatches(body.matches ?? []);
          setError("");
        })
        .catch((caught: unknown) => {
          setError(caught instanceof Error ? caught.message : "조회 실패");
        });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [hub, query, emptyOnly]);

  return (
    <div className="vod-match-list">
      <div className="vod-toolbar">
        <label className="vod-season">
          <span className="vod-search-label">대회</span>
          <select className="vod-season-select" value={hub} onChange={(event) => setHub(event.target.value)}>
            <option value="">전체</option>
            {VOD_HUB_CARDS.map((card) => (
              <option key={card.id} value={card.id}>
                {card.label}
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
            placeholder="팀 이름 · 약자  예: KT"
            autoComplete="off"
          />
        </label>
        <label className="ops-check">
          <input type="checkbox" checked={emptyOnly} onChange={(event) => setEmptyOnly(event.target.checked)} />
          리액션 없는 경기만
        </label>
      </div>
      {error ? <p className="empty">{error}</p> : null}
      {matches.length === 0 && !error ? (
        <p className="empty">조건에 맞는 끝난 경기가 없습니다.</p>
      ) : (
        <div className="match-list">
          {matches.map((match) => (
            <Link key={match.id} href={`/ops/matches/${match.id}`} className="match-card">
              <div className="match-meta">
                <span>
                  {match.tournament} {match.split}
                </span>
                <span>BO{match.bestOf}</span>
              </div>
              <div className="match-teams">
                <p className="team-name">{match.blueAbbr}</p>
                <span className="vs">VS</span>
                <p className="team-name" style={{ textAlign: "right" }}>
                  {match.redAbbr}
                </p>
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
