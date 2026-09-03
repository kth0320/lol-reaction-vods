"use client";

import { useState } from "react";

export function CasterAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const classes = className ? `caster-avatar ${className}` : "caster-avatar";
  if (!src || failed) {
    return (
      <span className={`${classes} caster-avatar-fallback`} aria-hidden>
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={classes}
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
