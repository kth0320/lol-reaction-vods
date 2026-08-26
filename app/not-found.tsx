import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <h1 className="brand-title">경기를 찾을 수 없습니다</h1>
      <p className="page-lead">목록에서 다른 경기를 골라 주세요.</p>
      <Link className="button primary" href="/">
        경기 목록으로
      </Link>
    </main>
  );
}
