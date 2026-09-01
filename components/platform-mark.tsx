import type { ReactNode } from "react";
import { isPlatform, type Platform } from "@/lib/playback";

export function PlatformMark({ platform, className }: { platform: string; className?: string }) {
  const mark = isPlatform(platform) ? MARKS[platform] : null;
  if (!mark) {
    return <span className={className}>{platform.slice(0, 1)}</span>;
  }
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {mark}
    </svg>
  );
}

const MARKS: Record<Platform, ReactNode> = {
  youtube: (
    <>
      <rect width="24" height="24" rx="7" fill="#FF0033" />
      <path fill="#fff" d="M9.4 7.6v8.8L18 12z" />
    </>
  ),
  twitch: (
    <>
      <rect width="24" height="24" rx="7" fill="#9146FF" />
      <path
        fill="#fff"
        d="M6.4 5h12.2v8.4L15 17h-3.2L10 19.2H8.2V17H5.2V7.2zm1.8 1.8v8.2h2.1v1.8l1.8-1.8h3.2l2.3-2.3V6.8z"
      />
      <rect x="13.1" y="8.4" width="1.5" height="3.4" fill="#9146FF" />
      <rect x="9.8" y="8.4" width="1.5" height="3.4" fill="#9146FF" />
    </>
  ),
  chzzk: (
    <>
      <rect width="24" height="24" rx="7" fill="#141517" />
      <path
        fill="#00FFA3"
        d="M16.8 6.2c-3.4-1.6-7.6-.4-9.6 2.8-2 3.2-1.2 7.4 1.8 9.6 2.4 1.8 5.8 1.8 8.2.2-2.2.2-4.6-.6-6.2-2.4-2.2-2.4-2.2-6.2.2-8.4 1.8-1.8 4.6-2.2 6.8-1.2.2-.2.2-.4-.2-.6z"
      />
    </>
  ),
  soop: (
    <>
      <rect width="24" height="24" rx="7" fill="#00E6A0" />
      <path
        fill="#111"
        d="M7.2 8.4c2.4-2 6.2-1.8 8.4.6 1.2 1.4 1.6 3.2 1.2 4.8-.8-.8-1.8-1.4-3-1.6.4 1.2.2 2.6-.6 3.6-1.4 1.8-3.8 2.2-5.8 1.2 1.2.2 2.6 0 3.6-.8 1.4-1 1.8-2.8 1.2-4.2-1.6 1.4-4 1.4-5.6-.2-1.2-1.2-1.4-3-.4-4.4.2-.4.6-.8 1-.9z"
      />
    </>
  ),
};
