import { getPlayback, isPlatform } from "@/lib/playback";
import type { WatchLink } from "@/lib/watch-links";

export function WatchOutbound({
  live = false,
  links,
}: {
  live?: boolean;
  links: WatchLink[];
}) {
  return (
    <div className="link-out">
      <p>
        {live
          ? "생방송은 누렁카세에서 재생하지 않습니다. 원본 플랫폼으로 이동합니다."
          : "다시보기는 누렁카세에서 재생하지 않습니다. 원본 플랫폼으로 이동합니다."}
      </p>
      <div className="button-row">
        {links.map((link) => (
          <a key={`${link.label}-${link.href}`} className="button primary" href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function VodPlayer({
  platform,
  url,
  live = false,
}: {
  platform: string;
  externalId?: string;
  url: string;
  live?: boolean;
}) {
  if (!isPlatform(platform)) {
    return (
      <a className="button ghost" href={url} target="_blank" rel="noreferrer">
        원본 열기
      </a>
    );
  }

  const playback = getPlayback(platform, "", url, { live });
  return (
    <WatchOutbound
      live={live}
      links={[{ href: playback.originalUrl, label: `${playback.label}에서 ${live ? "같이 보기" : "보기"}` }]}
    />
  );
}
