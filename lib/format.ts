const kst = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatKst(date: Date): string {
  return `${kst.format(date)} KST`;
}

export function kstYear(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric" }).formatToParts(date);
  return Number(parts.find((part) => part.type === "year")?.value);
}

/** YYYY-MM-DD in Seoul. Day-of-event VOD titles attach by this, not UTC. */
export function kstDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

/** MMDD in Seoul, e.g. March 1 → 301. */
export function kstMonthDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return month * 100 + day;
}

export function formatViewers(count: number | null | undefined): string {
  if (count == null || count < 0) return "-";
  if (count >= 10_000) {
    const man = count / 10_000;
    return `${man >= 10 ? man.toFixed(0) : man.toFixed(1).replace(/\.0$/, "")}만`;
  }
  return count.toLocaleString("ko-KR");
}
