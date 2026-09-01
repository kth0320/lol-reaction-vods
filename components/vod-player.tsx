import { PlatformMark } from "@/components/platform-mark";
import { getPlayback, isPlatform } from "@/lib/playback";
import type { WatchLink } from "@/lib/watch-links";

export function WatchOutbound({ links }: { live?: boolean; links: WatchLink[] }) {
  return (
    <div className="platform-links">
      {links.map((link) => (
        <a
          key={`${link.platform}-${link.href}`}
          className="platform-hit"
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label}
          title={link.label}
        >
          <PlatformMark platform={link.platform} />
        </a>
      ))}
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
      links={[
        {
          href: playback.originalUrl,
          platform,
          label: `${playback.label}에서 ${live ? "같이 보기" : "보기"}`,
        },
      ]}
    />
  );
}
