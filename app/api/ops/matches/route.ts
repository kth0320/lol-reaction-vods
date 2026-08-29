import { listOpsMatches, OpsError } from "@/lib/ops";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const matches = await listOpsMatches({
      q: url.searchParams.get("q") ?? "",
      hub: url.searchParams.get("hub") ?? "",
      emptyOnly: url.searchParams.get("empty") === "1",
    });
    return NextResponse.json({ matches });
  } catch (error) {
    const status = error instanceof OpsError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "조회 실패" }, { status });
  }
}
