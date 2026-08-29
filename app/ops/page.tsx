import { OpsMatchList } from "@/components/ops-match-list";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function OpsPage() {
  return (
    <main>
      <Link href="/" className="back-link">
        ← 메인
      </Link>
      <h1 className="section-title">보정</h1>
      <p className="page-lead">
        로컬 운영 화면입니다. 인증은 아직 없습니다. 자동 매칭이 틀린 리액션은 끊고, 빠진 YouTube·치지직·숲 주소를
        경기에 붙입니다. Twitch 원본 VOD는 안 받습니다.
      </p>
      <OpsMatchList />
    </main>
  );
}
