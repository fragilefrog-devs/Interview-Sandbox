import Link from "next/link";
import { ArrowLeft, CircleCheck, CircleX, CirclePlus, RotateCcw } from "lucide-react";
import { PrintButton } from "@/components/print-button";
import { btnGhost, btnPrimary } from "@/components/ui";
import { archetypeLabel, difficultyLabel, fmtDuration } from "@/lib/format";
import type { Archetype, Difficulty, Message, Report } from "@/lib/schemas";

export type ReportMeta = { role: string; archetype: Archetype; difficulty: Difficulty; durationMs: number | null; turns: number };

const sev = {
  high: { border: "border-caution", badge: "bg-caution-soft text-caution", label: "High priority" },
  medium: { border: "border-muted", badge: "bg-line/60 text-ink", label: "Medium priority" },
  low: { border: "border-line", badge: "bg-line/60 text-muted", label: "Low priority" },
} as const;

export function ReportView({ report, candidateName, meta, transcript, notes }: {
  report: Report; candidateName: string; meta?: ReportMeta; transcript?: Message[]; notes?: string;
}) {
  const signals = report.signals ?? [];
  const high = report.observations.filter((o) => o.severity === "high").length;
  const caught = signals.filter((s) => s.caught).length;
  const rerun = meta ? `/app/new?role=${encodeURIComponent(meta.role)}&archetype=${meta.archetype}&difficulty=${meta.difficulty}` : "/app/new";

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <Link href="/app/sessions" className="no-print inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" aria-hidden />All sessions</Link>
      <h1 className="mt-4 font-serif text-3xl">Your interviewer report</h1>
      {meta && (
        <p className="mt-2 text-sm text-muted">
          {meta.role}, interviewing {candidateName}. {archetypeLabel[meta.archetype]} candidate on {difficultyLabel[meta.difficulty].toLowerCase()} difficulty
          {meta.durationMs != null && fmtDuration(meta.durationMs) ? `, ${fmtDuration(meta.durationMs)}` : ""}, {meta.turns} question{meta.turns === 1 ? "" : "s"}.
        </p>
      )}
      <p className="mt-5 font-serif text-xl leading-relaxed">{report.summary}</p>

      <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-line bg-surface p-3"><p className="text-muted">Missed moments</p><p className="font-serif text-2xl tabular-nums">{report.observations.length}</p></div>
        <div className="rounded-lg border border-line bg-surface p-3"><p className="text-muted">High priority</p><p className="font-serif text-2xl tabular-nums">{high}</p></div>
        <div className="rounded-lg border border-line bg-surface p-3"><p className="text-muted">Hidden facts found</p><p className="font-serif text-2xl tabular-nums">{signals.length ? `${caught} of ${signals.length}` : "None"}</p></div>
      </div>

      {report.strengths.length > 0 && <>
        <h2 className="mt-10 font-serif text-2xl">What worked</h2>
        <ul className="mt-3 space-y-2 text-sm">{report.strengths.map((s) => <li key={s} className="flex gap-2"><CircleCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />{s}</li>)}</ul>
      </>}

      <h2 className="mt-10 font-serif text-2xl">Missed opportunities</h2>
      <div className="mt-4 space-y-4">
        {report.observations.length === 0 && <p className="text-sm text-muted">None detected in this session.</p>}
        {report.observations.map((o, i) => (
          <section key={i} className={`break-inside-avoid rounded-lg border border-l-4 bg-surface p-4 text-sm ${sev[o.severity].border}`}>
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{o.dimension}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sev[o.severity].badge}`}>{sev[o.severity].label}</span></div>
            <blockquote className="mt-2 border-l-2 border-line pl-3 text-muted">{o.transcriptEvidence}</blockquote>
            <p className="mt-2">{o.explanation}</p>
            <p className="mt-2 font-medium text-accent">{o.recommendation}</p>
          </section>
        ))}
      </div>

      {signals.length > 0 && <>
        <h2 className="mt-10 font-serif text-2xl">What {candidateName} was holding back</h2>
        <p className="mt-1 text-sm text-muted">Hidden facts from the candidate’s background, and whether your questions surfaced them.</p>
        <ul className="mt-4 space-y-3 text-sm">
          {signals.map((s) => (
            <li key={s.label} className={`break-inside-avoid rounded-lg border border-l-4 bg-surface p-4 ${s.caught ? "border-accent" : "border-caution"}`}>
              <p className="flex items-center gap-2 font-medium">
                {s.caught ? <CircleCheck className="size-4 text-accent" aria-hidden /> : <CircleX className="size-4 text-caution" aria-hidden />}
                {s.label}<span className="font-normal text-muted">{s.caught ? "you went after it" : "you did not go after it"}</span>
              </p>
              <p className="mt-1.5">{s.detail}</p>
            </li>
          ))}
        </ul>
      </>}

      <h2 className="mt-10 font-serif text-2xl">Your go-to probes</h2>
      <ul className="mt-3 space-y-1.5 border-l-2 border-line pl-4 text-sm">{report.probingGuide.map((p) => <li key={p}>{p}</li>)}</ul>

      {transcript && transcript.length > 0 && (
        <details className="mt-10 rounded-lg border border-line bg-surface p-4 text-sm">
          <summary className="cursor-pointer font-medium">Full transcript ({transcript.length} messages)</summary>
          <ol className="mt-4 space-y-3">
            {transcript.map((m, i) => <li key={i}><p className="text-xs text-muted">{m.speaker === "interviewer" ? "You" : candidateName}</p><p className="whitespace-pre-wrap">{m.content}</p></li>)}
          </ol>
          {notes?.trim() && <div className="mt-5 border-t border-line pt-4"><p className="text-xs text-muted">Your notes</p><p className="whitespace-pre-wrap">{notes}</p></div>}
        </details>
      )}

      <p className="mt-10 text-xs text-muted">Educational guidance, not legal advice. This report evaluates your interviewing, not the candidate.</p>
      <div className="no-print mt-5 flex flex-wrap gap-2">
        <Link href={rerun} className={btnPrimary}><RotateCcw className="size-4" aria-hidden />Practise this setup again</Link>
        <Link href="/app/new" className={btnGhost}><CirclePlus className="size-4" aria-hidden />New session</Link>
        <PrintButton />
      </div>
    </article>
  );
}
