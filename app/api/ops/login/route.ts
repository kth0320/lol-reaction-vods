import { OPS_SESSION_COOKIE, opsAuthEnabled, passwordMatches, signOpsSession } from "@/lib/ops-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!opsAuthEnabled()) return NextResponse.json({ ok: true });
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    password = "";
  }
  if (!passwordMatches(password)) {
    return NextResponse.json({ error: "비밀번호가 틀렸습니다." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: OPS_SESSION_COOKIE,
    value: signOpsSession(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
