"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { LEAGUES, LIVE_CAROUSEL_INTERVAL_MS, type League } from "@/lib/leagues";
import { VsCard, type LiveSlide } from "@/components/vs-card";

export function LiveCarousel({ slides }: { slides: LiveSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animate, setAnimate] = useState(true);

  const looping = slides.length > 1;
  const trackSlides = looping ? [...slides, slides[0]] : slides;
  const realIndex = looping && index === slides.length ? 0 : index;
  const active = slides[realIndex] ?? slides[0];
  const present = new Set(slides.map((slide) => slide.tournament));

  useEffect(() => {
    if (!looping || paused) {
      return;
    }
    const timer = window.setInterval(() => {
      setAnimate(true);
      setIndex((current) => current + 1);
    }, LIVE_CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [looping, paused]);

  useLayoutEffect(() => {
    if (animate || index !== 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(frame);
  }, [animate, index]);

  function onTrackTransitionEnd() {
    if (looping && index >= slides.length) {
      setAnimate(false);
      setIndex(0);
    }
  }

  function selectLeague(league: League) {
    const next = slides.findIndex((slide) => slide.tournament === league);
    if (next < 0) {
      return;
    }
    setAnimate(true);
    setIndex(next);
  }

  if (slides.length === 0) {
    return null;
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
        <div
          className={`live-track${animate ? "" : " no-animate"}`}
          style={{
            width: `${trackSlides.length * 100}%`,
            transform: `translateX(-${(index * 100) / trackSlides.length}%)`,
          }}
          onTransitionEnd={onTrackTransitionEnd}
        >
          {trackSlides.map((slide, slideIndex) => (
            <div className="live-slide" key={`${slide.id}-${slideIndex}`}>
              <VsCard slide={slide} href={`/matches/${slide.id}`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
