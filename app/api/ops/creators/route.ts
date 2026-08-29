import { listOpsCreators } from "@/lib/ops";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ creators: await listOpsCreators() });
}
