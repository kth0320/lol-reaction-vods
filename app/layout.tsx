import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "누렁카세",
  description: "지금 경기를 중계하는 스트리머·BJ에게 연결하고, 지난 경기 다시보기를 모읍니다.",
  icons: { icon: "/nureongkase-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <Link href="/" className="brand-home">
              <img className="brand-logo" src="/nureongkase-logo.png" alt="" />
              <span className="brand-copy">
                <span className="brand-kicker">롤 리액션 VOD</span>
                <span className="brand-title">누렁카세</span>
              </span>
            </Link>
            <div className="header-nav">
              <Link href="/ops" className="nav-link">
                보정
              </Link>
              <Link href="/candidates" className="nav-link">
                수집 후보
              </Link>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
