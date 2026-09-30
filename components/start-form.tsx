"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Flame, Keyboard, LoaderCircle, Mic, MessageCircleQuestion, Play, Sparkles, Target } from "lucide-react";
import { archetypes, difficulties, modes, type Archetype, type Difficulty, type FocusArea, type Mode } from "@/lib/schemas";
import { btnPrimary, input } from "@/components/ui";

const ARCH: Record<Archetype, { label: string; hint: string; icon: typeof Target }> = {
  strong: { label: "Strong", hint: "Specific and evidence-rich. Good for practising follow-ups that go deeper.", icon: Target },
  vague: { label: "Vague", hint: "Speaks in “we” and generalities. Practise pinning down personal contribution.", icon: MessageCircleQuestion },
  polished: { label: "Polished", hint: "Articulate but light on specifics. Practise seeing past a smooth answer.", icon: Sparkles },
};
const DIFF: Record<Difficulty, { label: string; hint: string }> = {
  standard: { label: "Standard", hint: "Rewards good probing with real detail." },
  hard: { label: "Hard", hint: "Deflects, embellishes, and hides an inconsistency for you to catch." },
};

const OBJ: Record<FocusArea, string> = { ownership: "Ownership probing", evidence: "Evidence probing", questions: "Question quality", fairness: "Fair questions", notes: "Note quality" };

export function StartForm({ defaultRole, defaultArchetype = "polished", defaultDifficulty, blocked, voiceEnabled = false, focusAreas = [] }: {
  defaultRole: string; defaultArchetype?: Archetype; defaultDifficulty: Difficulty; blocked?: boolean; voiceEnabled?: boolean; focusAreas?: FocusArea[];
}) {
  const router = useRouter();
  const [role, setRole] = useState(defaultRole);
  const [archetype, setArchetype] = useState<Archetype>(defaultArchetype);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [mode, setMode] = useState<Mode>(voiceEnabled ? "voice" : "text");
  const [objective, setObjective] = useState<FocusArea | "">(focusAreas[0] ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (fallback.current) clearTimeout(fallback.current); }, []);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (pending || blocked || role.trim().length < 2) return;
    setPending(true); setError("");
    try {
      const res = await fetch("/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: role.trim(), archetype, difficulty, mode, objective: objective || undefined }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) throw new Error(data?.error ?? "Could not start the session.");
      // Go straight into the interview. Stay in the pending state until the new page replaces this one,
      // and hard-navigate if the client router has not moved after a moment.
      const url = `/app/practice/${data.id}`;
      router.push(url);
      fallback.current = setTimeout(() => { if (location.pathname !== url) location.assign(url); }, 2500);
    } catch (err) {
      setPending(false); setError(err instanceof Error ? err.message : "Could not start the session.");
    }
  }

  return (
    <form onSubmit={start} className="space-y-8">
      <label className="block max-w-md text-sm font-medium">Role you are hiring for
        <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} required minLength={2} placeholder="Senior backend engineer" className={input} />
      </label>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Practice candidate</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {archetypes.map((a) => {
            const { label, hint, icon: Icon } = ARCH[a];
            return (
              <label key={a} className={`cursor-pointer rounded-lg border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${archetype === a ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-muted"}`}>
                <input type="radio" name="archetype" value={a} checked={archetype === a} onChange={() => setArchetype(a)} className="sr-only" />
                <span className="flex items-center gap-2 font-medium"><Icon className={`size-4 ${archetype === a ? "text-accent" : "text-muted"}`} aria-hidden />{label}</span>
                <span className="mt-1.5 block text-sm text-muted">{hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Format</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {modes.map((m) => {
            const off = m === "voice" && !voiceEnabled;
            return (
              <label key={m} className={`rounded-lg border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${off ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${mode === m ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-muted"}`}>
                <input type="radio" name="mode" value={m} disabled={off} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
                <span className="flex items-center gap-2 font-medium">{m === "voice" ? <Mic className="size-4" aria-hidden /> : <Keyboard className="size-4" aria-hidden />}{m === "voice" ? "Voice" : "Text"}</span>
                <span className="mt-1.5 block text-sm text-muted">{m === "voice" ? (off ? "Not configured on this deployment (needs Vapi keys)." : "Speak with the candidate. Also coaches timing: interruptions, talk ratio, pauses.") : "Type your questions. Best for careful wording."}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="block max-w-md text-sm font-medium">Training objective
        <select value={objective} onChange={(e) => setObjective(e.target.value as FocusArea | "")} className={input}>
          <option value="">No specific objective</option>
          {(Object.keys(OBJ) as FocusArea[]).map((k) => <option key={k} value={k}>{OBJ[k]}</option>)}
        </select>
      </label>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Difficulty</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {difficulties.map((d) => (
            <label key={d} className={`cursor-pointer rounded-lg border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${difficulty === d ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-muted"}`}>
              <input type="radio" name="difficulty" value={d} checked={difficulty === d} onChange={() => setDifficulty(d)} className="sr-only" />
              <span className="flex items-center gap-2 font-medium">{d === "hard" && <Flame className="size-4 text-caution" aria-hidden />}{DIFF[d].label}</span>
              <span className="mt-1.5 block text-sm text-muted">{DIFF[d].hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p role="alert" className="text-sm text-caution">{error}</p>}
      {blocked && <p role="alert" className="text-sm text-caution">You have reached today’s practice limit. It resets on a rolling 24-hour basis.</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button disabled={pending || blocked || role.trim().length < 2} className={btnPrimary}>
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
          {pending ? "Preparing your candidate" : "Start interview"}
        </button>
        <p className="text-xs text-muted">The candidate is synthetic. Only your questions and notes are evaluated.</p>
      </div>

      {pending && (
        <div role="status" className="fixed inset-0 z-[55] flex items-center justify-center bg-paper/80 backdrop-blur-sm">
          <div className="page-in mx-4 max-w-sm rounded-lg border border-line bg-surface p-6 text-center shadow-lg">
            <LoaderCircle className="mx-auto size-6 animate-spin text-accent" aria-hidden />
            <p className="mt-3 font-serif text-xl">Preparing your candidate</p>
            <p className="mt-1 text-sm text-muted">Building their background and opening the interview. This can take up to a minute with a live model.</p>
          </div>
        </div>
      )}
    </form>
  );
}
