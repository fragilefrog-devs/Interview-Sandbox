import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { archetypeLabel, difficultyLabel, fmtDate } from "@/lib/format";
import type { SessionRow } from "@/lib/stats";

export function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-serif text-3xl tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SessionLinks({ rows }: { rows: SessionRow[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {rows.map((s) => (
        <li key={s.id}>
          <Link href={`/app/practice/${s.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-line/30">
            <span className="min-w-0">
              <span className="block truncate font-medium">{s.role}</span>
              <span className="block text-sm text-muted">{s.candidate ? `${s.candidate}, ` : ""}{archetypeLabel[s.archetype].toLowerCase()} candidate, {difficultyLabel[s.difficulty].toLowerCase()}, {fmtDate(s.createdAt)}</span>
            </span>
            <span className="flex items-center gap-3"><StatusBadge status={s.status} /><ArrowRight className="size-4 text-muted" aria-hidden /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
