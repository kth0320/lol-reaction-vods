import { OpsMatchEditor } from "@/components/ops-match-editor";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OpsMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main>
      <Link href="/ops" className="back-link">
        ← 보정
      </Link>
      <h1 className="section-title">경기 보정</h1>
      <OpsMatchEditor matchId={id} />
    </main>
  );
}
