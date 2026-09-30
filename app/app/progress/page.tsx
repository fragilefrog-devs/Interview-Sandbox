import Link from "next/link";
import { CirclePlus, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Page } from "@/components/page";
import { btnPrimary } from "@/components/ui";
import { fmtDate, fmtDuration } from "@/lib/format";
import { loadSessionRows } from "@/lib/session-rows";
import { requireOnboarded } from "@/lib/session";
import { DIMENSIONS, summarize } from "@/lib/stats";
import { Tile } from "../overview-parts";

export const metadata = { title: "Progress" };

export default async function Progress() {
  const { user } = await requireOnboarded();
  const s = summarize(await loadSessionRows(user.id));

  if (s.completed === 0) {
    return (
      <Page title="Progress" description="Trends across your finished sessions.">
        <EmptyState icon={TrendingUp} title="No reports to compare yet"
          action={<Link href="/app/new" className={btnPrimary}><CirclePlus className="size-4" aria-hidden />Start a session</Link>}>
          Finish a session and end the interview to get your first report. After a few, this page shows where you keep missing and whether you are improving.
        </EmptyState>
      </Page>
    );
  }

  const maxDim = Math.max(1, ...DIMENSIONS.map((d) => s.byDim[d].count));
  const recent = s.perSession.slice(-12);
  const { recent: r, previous: p } = s.trend;
  const trendText = r != null && p != null
    ? r < p ? `Your last ${Math.min(3, s.completed)} sessions averaged ${r.toFixed(1)} missed moments, down from ${p.toFixed(1)} before that.`
      : r > p ? `Your last ${Math.min(3, s.completed)} sessions averaged ${r.toFixed(1)} missed moments, up from ${p.toFixed(1)} before that. Harder candidates surface more, so check the difficulty.`
      : `Your last sessions averaged ${r.toFixed(1)} missed moments, the same as before.`
    : "Complete at least four sessions to see a trend.";

  return (
    <Page title="Progress" description={trendText}>
      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Reports" value={String(s.completed)} />
        <Tile label="Missed moments" value={String(s.misses)} hint={`${(s.misses / s.completed).toFixed(1)} per session`} />
        <Tile label="High priority" value={String(s.high)} />
        <Tile label="Hidden facts found" value={s.signalRate == null ? "None yet" : `${Math.round(s.signalRate * 100)}%`} hint={s.practiceMs ? `${fmtDuration(s.practiceMs)} practised` : undefined} />
      </section>

      <section aria-labelledby="dim-h" className="mt-10">
        <h2 id="dim-h" className="font-serif text-2xl">Where you miss most</h2>
        <p className="mt-1 text-sm text-muted">Missed moments by skill, across all reports. Fewer is better.</p>
        <ul className="mt-4 space-y-3 rounded-lg border border-line bg-surface p-5">
          {[...DIMENSIONS].sort((a, b) => s.byDim[b].count - s.byDim[a].count).map((d) => {
            const { count, high } = s.byDim[d];
            return (
              <li key={d}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{d}</span>
                  <span className="tabular-nums text-muted">{count}{high ? `, ${high} high priority` : ""}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={`${d}: ${count} missed moments`}>
                  <div className={`h-full rounded-full ${high ? "bg-caution" : "bg-accent"}`} style={{ width: `${(count / maxDim) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="facts-h" className="mt-10">
        <h2 id="facts-h" className="font-serif text-2xl">Hidden facts found, session by session</h2>
        <p className="mt-1 text-sm text-muted">Each bar is one session, oldest on the left. Full height means you went after every hidden fact.</p>
        <div className="mt-4 rounded-lg border border-line bg-surface p-5">
          <ol className="flex h-36 items-end gap-2">
            {recent.map((x) => {
              const ratio = x.signals ? x.caught / x.signals : 0;
              return (
                <li key={x.id} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                  <Link href={`/app/practice/${x.id}`} title={`${x.role}, ${fmtDate(x.date)}: ${x.caught} of ${x.signals} found`}
                    aria-label={`${x.role}, ${fmtDate(x.date)}: ${x.caught} of ${x.signals} hidden facts found`}
                    className="flex h-full flex-col justify-end rounded-t hover:opacity-80">
                    <span className="block w-full rounded-t bg-accent" style={{ height: `${Math.max(x.signals ? ratio * 100 : 0, 4)}%`, opacity: x.signals ? 1 : 0.25 }} />
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="mt-2 flex justify-between text-xs text-muted"><span>{fmtDate(recent[0].date)}</span><span>{fmtDate(recent[recent.length - 1].date)}</span></div>
        </div>
      </section>

      <section aria-labelledby="rep-h" className="mt-10">
        <h2 id="rep-h" className="font-serif text-2xl">Recent reports</h2>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface text-sm">
          {[...s.perSession].reverse().slice(0, 8).map((x) => (
            <li key={x.id}>
              <Link href={`/app/practice/${x.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-line/30">
                <span className="font-medium">{x.role}</span>
                <span className="text-muted">{fmtDate(x.date)}, {x.misses} missed{x.high ? ` (${x.high} high)` : ""}{x.signals ? `, ${x.caught} of ${x.signals} facts found` : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
