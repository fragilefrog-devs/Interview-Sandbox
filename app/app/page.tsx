import Link from "next/link";
import { ArrowRight, CirclePlus, Lightbulb, MessagesSquare, Play, Target } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Page } from "@/components/page";
import { btnGhost, btnPrimary } from "@/components/ui";
import { fmtDuration } from "@/lib/format";
import { loadSessionRows } from "@/lib/session-rows";
import { requireOnboarded } from "@/lib/session";
import { summarize } from "@/lib/stats";
import { focusOptions } from "@/lib/profile-options";
import { SessionLinks, Tile } from "./overview-parts";

export const metadata = { title: "Overview" };

export default async function Overview() {
  const { user, profile } = await requireOnboarded();
  const rows = await loadSessionRows(user.id);
  const stats = summarize(rows);
  const active = rows.find((r) => r.status === "active");
  const last = rows.find((r) => r.status === "completed" && r.report && r.report.observations.length > 0);
  const focus = last?.report?.observations[0];
  const firstName = user.name.split(" ")[0];

  if (rows.length === 0) {
    return (
      <Page title={`Welcome, ${firstName}`} description="Your first session takes about ten minutes.">
        <EmptyState icon={MessagesSquare} title="No sessions yet"
          action={<Link href="/app/new" className={btnPrimary}><CirclePlus className="size-4" aria-hidden />Start your first session</Link>}>
          You interview a synthetic candidate, take notes as you go, then get a report tied to exact moments in the transcript.
        </EmptyState>
        <ol className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
          {[["Choose a candidate", "Strong, vague or polished. Each hides a different amount."], ["Interview them", "Ask anything a real interviewer would. Take notes as you go."], ["Review the report", "See what you missed and what the candidate held back."]].map(([t, d], i) => (
            <li key={t} className="rounded-lg border border-line bg-surface p-4"><p className="font-medium">{i + 1}. {t}</p><p className="mt-1 text-muted">{d}</p></li>
          ))}
        </ol>
      </Page>
    );
  }

  return (
    <Page title={`Welcome back, ${firstName}`} description="Where your interviewing stands, and what to work on next."
      actions={<Link href="/app/new" className={btnPrimary}><CirclePlus className="size-4" aria-hidden />New session</Link>}>
      {active && (
        <section aria-label="Continue" className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-accent bg-accent-soft p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-accent">Interview in progress</p>
            <p className="mt-0.5 truncate font-medium">{active.role}{active.candidate ? ` with ${active.candidate}` : ""}</p>
            <p className="text-sm text-muted">{active.turns > 0 ? `${Math.ceil(active.turns / 2)} exchange${active.turns > 2 ? "s" : ""} so far.` : "No questions asked yet."}</p>
          </div>
          <Link href={`/app/practice/${active.id}`} className={btnPrimary}><Play className="size-4" aria-hidden />Resume</Link>
        </section>
      )}

      <section aria-label="Your numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Reports" value={String(stats.completed)} hint={stats.active ? `${stats.active} in progress` : undefined} />
        <Tile label="Hidden facts found" value={stats.signalRate == null ? "None yet" : `${Math.round(stats.signalRate * 100)}%`} hint={stats.signals ? `${stats.caught} of ${stats.signals}` : "Finish a session to see this"} />
        <Tile label="High-priority misses" value={String(stats.high)} hint={stats.completed ? `across ${stats.completed} report${stats.completed > 1 ? "s" : ""}` : undefined} />
        <Tile label="Practice time" value={stats.practiceMs ? fmtDuration(stats.practiceMs) : "None yet"} />
      </section>

      {focus && last && (
        <section aria-labelledby="focus-h" className="mt-8 rounded-lg border border-line bg-surface p-5">
          <h2 id="focus-h" className="flex items-center gap-2 font-serif text-xl"><Lightbulb className="size-5 text-accent" aria-hidden />Work on this next</h2>
          <p className="mt-2 text-sm text-muted">From your last report, {focus.dimension.toLowerCase()} ({focus.severity} priority):</p>
          <p className="mt-2 text-sm">{focus.explanation}</p>
          <p className="mt-2 text-sm font-medium text-accent">{focus.recommendation}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/app/practice/${last.id}`} className={btnGhost}>Open report</Link>
            <Link href={`/app/new?role=${encodeURIComponent(last.role)}&archetype=${last.archetype}&difficulty=${last.difficulty}`} className={btnGhost}><Target className="size-4" aria-hidden />Practise it again</Link>
          </div>
        </section>
      )}

      <section aria-labelledby="recent-h" className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="recent-h" className="font-serif text-2xl">Recent sessions</h2>
          <Link href="/app/sessions" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">View all<ArrowRight className="size-3.5" aria-hidden /></Link>
        </div>
        <SessionLinks rows={rows.slice(0, 5)} />
      </section>

      <p className="mt-8 text-xs text-muted">Focus areas: {profile.focusAreas.map((f) => focusOptions.find(([id]) => id === f)?.[1] ?? f).join(", ")}. <Link href="/app/settings" className="text-accent underline">Change</Link></p>
    </Page>
  );
}
