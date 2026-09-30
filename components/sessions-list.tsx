"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, CirclePlus, History, Search, SearchX, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast";
import { btnGhost, btnPrimary, input } from "@/components/ui";

export type ListRow = {
  id: string; role: string; candidate: string | null; archetype: string; difficulty: string; status: "active" | "completed";
  date: string; turns: number; misses: number | null; high: number | null;
};
type Filter = "all" | "active" | "completed";
const FILTERS: [Filter, string][] = [["all", "All"], ["active", "In progress"], ["completed", "Completed"]];

export function SessionsList({ rows: initial }: { rows: ListRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [target, setTarget] = useState<ListRow | null>(null);
  const [pending, setPending] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => (filter === "all" || r.status === filter) && (!needle || `${r.role} ${r.candidate ?? ""}`.toLowerCase().includes(needle)));
  }, [rows, q, filter]);

  async function remove() {
    if (!target) return;
    setPending(true);
    const res = await fetch(`/api/sessions/${target.id}`, { method: "DELETE" }).catch(() => null);
    setPending(false);
    if (!res?.ok) { toast("Could not delete that session. Try again.", "error"); return; }
    setRows((p) => p.filter((r) => r.id !== target.id));
    setTarget(null); toast("Session deleted"); router.refresh();
  }

  if (rows.length === 0) {
    return (
      <EmptyState icon={History} title="No sessions yet" action={<Link href="/app/new" className={btnPrimary}><CirclePlus className="size-4" aria-hidden />Start a session</Link>}>
        Every interview you run is saved here with its transcript, notes and report.
      </EmptyState>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-56 flex-1 sm:max-w-xs">
          <span className="sr-only">Search sessions</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by role or candidate" className={`${input} mt-0 pl-9`} />
        </label>
        <div role="group" aria-label="Filter by status" className="flex rounded-md border border-line bg-surface p-0.5 text-sm">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
              className={`rounded px-3 py-1.5 font-medium ${filter === id ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"}`}>{label}</button>
          ))}
        </div>
        <p className="ml-auto text-sm text-muted" aria-live="polite">{shown.length} of {rows.length}</p>
      </div>

      {shown.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={SearchX} title="Nothing matches" action={<button type="button" className={btnGhost} onClick={() => { setQ(""); setFilter("all"); }}>Clear filters</button>}>
            Try a different search or show all statuses.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {shown.map((r) => (
            <li key={r.id} className="group flex items-center">
              <Link href={`/app/practice/${r.id}`} className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-line/30">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.role}</span>
                  <span className="block text-sm text-muted">
                    {r.candidate ? `${r.candidate}, ` : ""}{r.archetype} candidate, {r.difficulty}, {r.date}
                    {r.status === "completed" && r.misses != null ? `, ${r.misses} missed moment${r.misses === 1 ? "" : "s"}${r.high ? ` (${r.high} high)` : ""}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-3"><StatusBadge status={r.status} /><ArrowRight className="size-4 text-muted" aria-hidden /></span>
              </Link>
              <button type="button" onClick={() => setTarget(r)} aria-label={`Delete session: ${r.role}, ${r.date}`}
                className="mr-2 flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-caution-soft hover:text-caution">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog open={!!target} onClose={() => !pending && setTarget(null)} onConfirm={remove} pending={pending} tone="danger" confirmLabel="Delete session"
        title="Delete this session?" description={target ? `“${target.role}” from ${target.date}, including its transcript, notes and report, will be permanently removed.` : undefined} />
    </>
  );
}
