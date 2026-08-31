"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeOpsNext } from "@/lib/ops-paths";

function OpsLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/ops/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError("비밀번호가 틀렸습니다.");
      return;
    }
    router.replace(safeOpsNext(search.get("next")));
    router.refresh();
  }

  return (
    <main>
      <h1 className="section-title">보정 로그인</h1>
      <p className="page-lead">운영 화면은 비밀번호가 있는 사람만 엽니다.</p>
      <form className="ops-form" onSubmit={onSubmit}>
        <label className="vod-search">
          <span className="vod-search-label">비밀번호</span>
          <input
            className="vod-search-input"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="ops-error">{error}</p> : null}
        <button className="button primary" type="submit">
          들어가기
        </button>
      </form>
    </main>
  );
}

export default function OpsLoginPage() {
  return (
    <Suspense fallback={<p className="page-lead">불러오는 중…</p>}>
      <OpsLoginForm />
    </Suspense>
  );
}
