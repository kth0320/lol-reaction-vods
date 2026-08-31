import { OPS_SESSION_COOKIE } from "@/lib/ops-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  const form = (request.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  const response =
    form || accept.includes("text/html")
      ? NextResponse.redirect(new URL("/ops/login", request.url), 303)
      : NextResponse.json({ ok: true });
  response.cookies.set({ name: OPS_SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return response;
}
