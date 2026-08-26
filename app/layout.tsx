import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoL 리액션 VOD",
  description: "지금 경기를 중계하는 스트리머·BJ에게 연결하고, 지난 경기 리액션 다시보기를 모읍니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <div>
              <p className="brand-kicker">lol-reaction-vods</p>
              <Link href="/" className="brand-title">
                LoL 리액션 VOD
              </Link>
              <p className="brand-note">브랜드 후보 누렁카세 / 누렁이 특식 · 미정. 음식 사이트가 아닙니다.</p>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
