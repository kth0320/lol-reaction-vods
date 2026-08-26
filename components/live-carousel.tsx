"use client";

import { useEffect, useState } from "react";
import { LEAGUES, LIVE_CAROUSEL_INTERVAL_MS, type League } from "@/lib/leagues";
import { VsCard, type LiveSlide } from "@/components/vs-card";

export function LiveCarousel({ slides }: { slides: LiveSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length <= 1 || paused) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, LIVE_CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  if (slides.length === 0) {
    return null;
  }

  const active = slides[index] ?? slides[0];
  const present = new Set(slides.map((slide) => slide.tournament));

  function selectLeague(league: League) {
    const next = slides.findIndex((slide) => slide.tournament === league);
    if (next >= 0) {
      setIndex(next);
    }
  }

  return (
    <section className="live-hub">
      <div className="live-hub-head">
        <h2 className="section-title">지금 생중계</h2>
        <p className="section-note">카드를 누르면 그 경기를 중계 중인 방송인이 나옵니다. 5초마다 리그가 바뀝니다.</p>
      </div>
      <div className="league-tabs" role="tablist" aria-label="리그">
        {LEAGUES.map((league) => {
          const enabled = present.has(league);
          const selected = active.tournament === league;
          return (
            <button
              key={league}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`league-tab${selected ? " selected" : ""}`}
              disabled={!enabled}
              onClick={() => selectLeague(league)}
            >
              {league}
            </button>
          );
        })}
      </div>
      <div
        className="live-hero"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <VsCard slide={active} href={`/matches/${active.id}`} />
      </div>
    </section>
  );
}
