"use client";

import { useEffect, useState } from "react";
import { getPlayback, isPlatform } from "@/lib/playback";

export function VodPlayer({
  platform,
  externalId,
  url,
  live = false,
}: {
  platform: string;
  externalId: string;
  url: string;
  live?: boolean;
}) {
  const [parent, setParent] = useState("");

  useEffect(() => {
    setParent(window.location.hostname);
  }, []);

  if (!isPlatform(platform)) {
    return (
      <a className="button ghost" href={url} target="_blank" rel="noreferrer">
        원본 열기
      </a>
    );
  }

  const playback = getPlayback(platform, externalId, url, { live, parentHost: parent || "localhost" });
  const action = live ? "같이 보기" : "원본 열기";

  if (playback.mode === "link-out") {
    return (
      <div className="link-out">
        <p>
          {live
            ? `${playback.label} 라이브는 사이트 안에서 재생하지 않습니다. 원본 방송으로 이동합니다.`
            : `${playback.label} 다시보기는 사이트 안에서 재생하지 않습니다. 원본으로 이동합니다.`}
        </p>
        <div className="button-row">
          <a className="button primary" href={playback.originalUrl} target="_blank" rel="noreferrer">
            {playback.label}에서 {live ? "같이 보기" : "보기"}
          </a>
        </div>
      </div>
    );
  }

  if (playback.needsParent && !parent) {
    return <div className="player-frame" aria-hidden="true" />;
  }

  return (
    <>
      <div className="player-frame">
        <iframe
          src={playback.embedUrl}
          title={`${playback.label} ${live ? "라이브" : "다시보기"}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="button-row">
        <a className="button ghost" href={playback.originalUrl} target="_blank" rel="noreferrer">
          {playback.label} {action}
        </a>
      </div>
    </>
  );
}
