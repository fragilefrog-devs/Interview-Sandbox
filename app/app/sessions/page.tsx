import { CirclePlus } from "lucide-react";
import Link from "next/link";
import { Page } from "@/components/page";
import { SessionsList, type ListRow } from "@/components/sessions-list";
import { btnPrimary } from "@/components/ui";
import { archetypeLabel, difficultyLabel, fmtDate } from "@/lib/format";
import { loadSessionRows } from "@/lib/session-rows";
import { requireOnboarded } from "@/lib/session";

export const metadata = { title: "Sessions" };

export default async function Sessions() {
  const { user } = await requireOnboarded();
  const rows = await loadSessionRows(user.id);
  const list: ListRow[] = rows.map((r) => ({
    id: r.id, role: r.role, candidate: r.candidate, archetype: archetypeLabel[r.archetype].toLowerCase(), difficulty: difficultyLabel[r.difficulty].toLowerCase(),
    status: r.status, date: fmtDate(r.createdAt, true), turns: r.turns,
    misses: r.report ? r.report.observations.length : null,
    high: r.report ? r.report.observations.filter((o) => o.severity === "high").length : null,
  }));
  return (
    <Page title="Sessions" description="Every interview you have run. Open one to resume it or read its report."
      actions={<Link href="/app/new" className={btnPrimary}><CirclePlus className="size-4" aria-hidden />New session</Link>}>
      <SessionsList rows={list} />
    </Page>
  );
}
