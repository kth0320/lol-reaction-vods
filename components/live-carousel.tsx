"use client";

import { useEffect, useMemo, useState } from "react";
import { PROTOTYPE_LIVE_LEAGUES, LIVE_CAROUSEL_INTERVAL_MS, type League } from "@/lib/leagues";
import { liveHubHref, liveHubRotateIndices, type LiveHubKind } from "@/lib/live-hub";
import { VsCard, type LiveSlide } from "@/components/vs-card";

export function LiveCarousel({ slides }: { slides: LiveSlide[] }) {
  const kinds = useMemo(
    () => slides.map((slide) => (slide.kind ?? "live") as LiveHubKind),
    [slides],
  );
  const rotate = useMemo(() => liveHubRotateIndices(kinds), [kinds]);
  const [index, setIndex] = useState(rotate[0] ?? 0);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);

  const looping = rotate.length > 1;
  const active = slides[index] ?? slides[0];

  useEffect(() => {
    if (!looping || paused || hold) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        const pos = rotate.indexOf(current);
        if (pos < 0) return current;
        return rotate[(pos + 1) % rotate.length];
      });
    }, LIVE_CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hold, looping, paused, rotate]);

  function selectLeague(league: League) {
    const next = slides.findIndex((slide) => slide.tournament === league);
    if (next < 0) return;
    setIndex(next);
    setHold((slides[next].kind ?? "live") !== "live");
  }

  if (slides.length === 0) return null;

  const anyLive = kinds.includes("live");

  return (
    <section className="live-hub">
      <div className="live-hub-head">
        <h2 className="section-title">{anyLive ? "지금 생중계" : "다음 경기"}</h2>
      </div>
      <div className="league-tabs" role="tablist" aria-label="리그">
        {PROTOTYPE_LIVE_LEAGUES.map((league) => {
          const selected = active?.tournament === league;
          return (
            <button
              key={league}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`league-tab${selected ? " selected" : ""}`}
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
        <div
          className="live-track"
          style={{
            width: `${slides.length * 100}%`,
            transform: `translateX(-${(index * 100) / slides.length}%)`,
          }}
        >
          {slides.map((slide) => (
            <div className="live-slide" key={slide.id}>
              <VsCard slide={slide} href={liveHubHref(slide.kind ?? "live", slide.id)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
