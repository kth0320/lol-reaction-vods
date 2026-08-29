import { attachReaction, OpsError } from "@/lib/ops";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      matchId?: string;
      creatorId?: string;
      url?: string;
      title?: string;
    };
    const reaction = await attachReaction({
      matchId: body.matchId ?? "",
      creatorId: body.creatorId ?? "",
      url: body.url ?? "",
      title: body.title,
    });
    return NextResponse.json({ reaction });
  } catch (error) {
    const status = error instanceof OpsError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "연결 실패" }, { status });
  }
}
