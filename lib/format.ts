const kst = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatKst(date: Date): string {
  return `${kst.format(date)} KST`;
}

export function formatViewers(count: number | null | undefined): string {
  if (count == null || count < 0) return "-";
  if (count >= 10_000) {
    const man = count / 10_000;
    return `${man >= 10 ? man.toFixed(0) : man.toFixed(1).replace(/\.0$/, "")}만`;
  }
  return count.toLocaleString("ko-KR");
}
