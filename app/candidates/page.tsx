import { pollLiveCandidates } from "@/lib/ingest/poll-live";
import { creatorKindLabel, isPlatform, platformLabel } from "@/lib/playback";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const rows = await pollLiveCandidates();
  const liveCount = rows.filter((row) => row.isLive).length;
  const matchedCount = rows.filter((row) => row.matchId).length;
  const fetchedAt = await prisma.liveCandidate.findFirst({
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });

  return (
    <main>
      <Link href="/" className="back-link">
        ← 메인
      </Link>
      <h1 className="section-title">수집 후보</h1>
      <p className="page-lead">
        프로토타입 화이트리스트 12명을 지금 조회한 결과입니다. 홈 vs 카드에는 올리지 않습니다. LEC 제목이 아니면
        경기에 연결하지 않습니다. (오늘 LCK 플레이오프가 켜 있으면 라이브로만 보이고, 시드 LEC 경기에는 안 붙습니다.)
      </p>
      <p className="section-note">
        {liveCount}명 라이브 · LEC 매칭 {matchedCount} · 마지막 조회{" "}
        {fetchedAt ? fetchedAt.fetchedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}
      </p>
      <div className="reaction-list">
        {rows.map((row) => (
          <article key={`${row.creatorId}-${row.platform}`} className="reaction-card">
            <div className="reaction-head">
              <div>
                <h2 className="creator-name">{row.creatorName}</h2>
                <p className="creator-kind">
                  {creatorKindLabel(row.creatorKind)} · {row.channelId}
                </p>
              </div>
              <span className={`status-pill ${row.isLive ? "on" : "off"}`}>{row.error ? "조회 실패" : row.isLive ? "LIVE" : "꺼짐"}</span>
            </div>
            <p className="reaction-title">{row.error ?? (row.title || "제목 없음")}</p>
            <div className="match-meta">
              <span className="platform-badge">{isPlatform(row.platform) ? platformLabel(row.platform) : row.platform}</span>
              <span>{row.matchLabel ?? "LEC 경기 미연결"}</span>
            </div>
            <div className="button-row" style={{ marginTop: 12 }}>
              <a className="button ghost" href={row.url} target="_blank" rel="noreferrer">
                원본 열기
              </a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
