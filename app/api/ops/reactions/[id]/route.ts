import { detachReaction, OpsError } from "@/lib/ops";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await detachReaction(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof OpsError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "해제 실패" }, { status });
  }
}
