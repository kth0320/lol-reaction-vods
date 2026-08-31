import { OpsMatchList } from "@/components/ops-match-list";
import { opsAuthEnabled } from "@/lib/ops-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function OpsPage() {
  return (
    <main>
      <div className="ops-toolbar">
        <Link href="/" className="back-link">
          ← 메인
        </Link>
        {opsAuthEnabled() ? (
          <form action="/api/ops/logout" method="post">
            <button className="button ghost" type="submit">
              나가기
            </button>
          </form>
        ) : null}
      </div>
      <h1 className="section-title">보정</h1>
      <p className="page-lead">
        자동 매칭이 틀린 리액션은 끊고, 빠진 YouTube·치지직·숲 주소를 경기에 붙입니다. Twitch 원본 VOD는 안 받습니다.
      </p>
      <OpsMatchList />
    </main>
  );
}
