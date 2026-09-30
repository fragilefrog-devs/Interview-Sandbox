import { card } from "@/components/ui";
import type { VoiceMetrics } from "@/lib/voice/types";

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

/** Behavior coaching that only voice can show. Describes the interviewer's conduct, never the candidate. */
export function VoiceMetricsCard({ metrics: m }: { metrics: VoiceMetrics }) {
  const talk = Math.round(m.talkRatio * 100);
  const stats: [string, string][] = [
    ["Your share of the talking", `${talk}%`],
    ["Questions asked", String(m.questions)],
    ["Interruptions", String(m.interruptions)],
    ["Avg. pause before you spoke", `${(m.avgResponseGapMs / 1000).toFixed(1)}s`],
    ["Longest turn of yours", mmss(m.longestInterviewerTurnMs)],
    ["Call length", mmss(m.durationMs)],
  ];
  const notes = [
    talk > 40 && `You did ${talk}% of the talking. Interviews tend to yield more evidence when the candidate speaks most of the time.`,
    m.interruptions > 0 && `You started speaking before the candidate finished ${m.interruptions} time${m.interruptions > 1 ? "s" : ""}. Try waiting a beat; the useful detail often comes after the first, polished sentence.`,
    m.interruptions === 0 && m.avgResponseGapMs > 0 && m.avgResponseGapMs < 700 && "You replied very quickly after answers. A short pause gives candidates room to add specifics.",
  ].filter(Boolean) as string[];

  return (
    <section className="mx-auto max-w-3xl px-6 pb-12" aria-labelledby="voice-heading">
      <div className={`${card} p-5`}>
        <h2 id="voice-heading" className="font-serif text-xl">How you sounded</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {stats.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 font-serif text-2xl tabular-nums">{v}</dd></div>)}
        </dl>
        {notes.length > 0 && <ul className="mt-5 list-disc space-y-1 pl-5 text-sm">{notes.map((n) => <li key={n}>{n}</li>)}</ul>}
        <p className="mt-4 text-xs text-muted">Timing is estimated from the call transcript. It coaches your interviewing habits and says nothing about the candidate.</p>
      </div>
    </section>
  );
}
