import { getOpsMatch, OpsError } from "@/lib/ops";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json({ match: await getOpsMatch(id) });
  } catch (error) {
    const status = error instanceof OpsError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "조회 실패" }, { status });
  }
}
