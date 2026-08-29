"use client";

import type { OpsCreatorDto, OpsMatchDetailDto } from "@/lib/dto";
import { isPlatform, platformLabel } from "@/lib/playback";
import Link from "next/link";
import { useEffect, useState } from "react";

export function OpsMatchEditor({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<OpsMatchDetailDto | null>(null);
  const [creators, setCreators] = useState<OpsCreatorDto[]>([]);
  const [creatorId, setCreatorId] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [matchRes, creatorRes] = await Promise.all([
      fetch(`/api/ops/matches/${encodeURIComponent(matchId)}`),
      fetch("/api/ops/creators"),
    ]);
    const matchBody = (await matchRes.json()) as { match?: OpsMatchDetailDto; error?: string };
    const creatorBody = (await creatorRes.json()) as { creators?: OpsCreatorDto[] };
    if (!matchRes.ok || !matchBody.match) {
      setError(matchBody.error || "경기를 찾을 수 없습니다.");
      setMatch(null);
      return;
    }
    setMatch(matchBody.match);
    setCreators(creatorBody.creators ?? []);
    setError("");
    if (!creatorId && creatorBody.creators?.[0]) setCreatorId(creatorBody.creators[0].id);
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function onDetach(id: string) {
    setBusy(true);
    const response = await fetch(`/api/ops/reactions/${encodeURIComponent(id)}`, { method: "DELETE" });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body.error || "해제 실패");
      return;
    }
    await reload();
  }

  async function onAttach(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/ops/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, creatorId, url, title }),
    });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body.error || "연결 실패");
      return;
    }
    setUrl("");
    setTitle("");
    await reload();
  }

  if (!match && error) {
    return <p className="empty">{error}</p>;
  }
  if (!match) {
    return <p className="empty">불러오는 중…</p>;
  }

  return (
    <div>
      {error && !match ? <p className="empty">{error}</p> : null}
      <div className="match-meta">
        <span>
          {match.tournament} · {match.split}
        </span>
        <span>BO{match.bestOf}</span>
      </div>
      <div className="ended-match-head">
        <div className="match-teams">
          <p className="team-name">{match.blueAbbr}</p>
          <span className="vs">VS</span>
          <p className="team-name" style={{ textAlign: "right" }}>
            {match.redAbbr}
          </p>
        </div>
        <p className="ended-match-names">
          {match.blueName} vs {match.redName}
        </p>
      </div>
      <p className="section-note">
        공개 경기 화면:{" "}
        <Link href={`/matches/${match.id}`} className="nav-link">
          /matches/{match.id}
        </Link>
      </p>
      <section className="vod-section">
        <h2 className="section-title">붙은 리액션 {match.reactions.length}개</h2>
        {match.reactions.length === 0 ? (
          <p className="empty">아직 연결된 리액션이 없습니다. 아래에서 주소를 붙이세요.</p>
        ) : (
          <div className="reaction-list">
            {match.reactions.map((reaction) => (
              <article key={reaction.id} className="reaction-card">
                <div className="reaction-head">
                  <div>
                    <h2 className="creator-name">{reaction.creatorName}</h2>
                    <p className="creator-kind">
                      {isPlatform(reaction.platform) ? platformLabel(reaction.platform) : reaction.platform}
                    </p>
                  </div>
                  <button type="button" className="button ghost" disabled={busy} onClick={() => void onDetach(reaction.id)}>
                    연결 해제
                  </button>
                </div>
                <p className="reaction-title">{reaction.title}</p>
                <a className="nav-link" href={reaction.url} target="_blank" rel="noreferrer">
                  {reaction.url}
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="vod-section">
        <h2 className="section-title">빠진 링크 붙이기</h2>
        {error ? <p className="ops-error">{error}</p> : null}
        <form className="ops-form" onSubmit={(event) => void onAttach(event)}>
          <label className="vod-season">
            <span className="vod-search-label">방송인</span>
            <select className="vod-season-select" value={creatorId} onChange={(event) => setCreatorId(event.target.value)}>
              {creators.map((creator) => (
                <option key={creator.id} value={creator.id}>
                  {creator.name}
                </option>
              ))}
            </select>
          </label>
          <label className="vod-search">
            <span className="vod-search-label">다시보기 주소</span>
            <input
              className="vod-search-input"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=…  /  치지직·숲"
              required
            />
          </label>
          <label className="vod-search">
            <span className="vod-search-label">제목 (선택)</span>
            <input
              className="vod-search-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="비우면 수동 보정"
            />
          </label>
          <button type="submit" className="button primary" disabled={busy}>
            연결
          </button>
        </form>
      </section>
    </div>
  );
}
