"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, MicOff, PhoneOff } from "lucide-react";
import { btnDanger, btnGhost, btnPrimary, card } from "@/components/ui";
import type { Archetype, Difficulty } from "@/lib/schemas";

type Seg = { speaker: "interviewer" | "candidate"; content: string; startMs: number; endMs: number };
type Phase = "idle" | "connecting" | "live" | "ending";
type VapiLike = { on: (e: string, cb: (...a: any[]) => void) => void; start: (id: string) => Promise<unknown>; stop: () => void; setMuted: (m: boolean) => void }; // eslint-disable-line @typescript-eslint/no-explicit-any

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function VoiceRoom({ sessionId, role, archetype, difficulty, candidate, initialNotes }: {
  sessionId: string; role: string; archetype: Archetype; difficulty: Difficulty; candidate: { name: string; headline: string }; initialNotes: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [segs, setSegs] = useState<Seg[]>([]);
  const [partial, setPartial] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState(initialNotes);
  const vapi = useRef<VapiLike | null>(null);
  const t0 = useRef(0);
  const segRef = useRef<Seg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (phase !== "live") return; const t = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(t); }, [phase]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [segs, partial]);
  useEffect(() => () => { try { vapi.current?.stop(); } catch { /* not started */ } }, []);

  // Debounced notes autosave (same endpoint as text mode).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => fetch(`/api/sessions/${sessionId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ notes }) }).catch(() => {}), 800);
    return () => clearTimeout(t);
  }, [notes, sessionId]);

  const addFinal = useCallback((role: "user" | "assistant", text: string) => {
    const speaker = role === "user" ? "interviewer" as const : "candidate" as const;
    const endMs = Date.now() - t0.current;
    const startMs = Math.max(0, endMs - Math.round((words(text) / 2.5) * 1000)); // client-side estimate; the webhook transcript is more precise
    const seg = { speaker, content: text, startMs, endMs };
    segRef.current = [...segRef.current, seg];
    setSegs(segRef.current); setPartial("");
  }, []);

  async function start() {
    setError(""); setPhase("connecting");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/voice`, { method: "POST" });
      const init = await res.json().catch(() => null);
      if (!res.ok || !init?.assistantId) throw new Error(init?.error ?? "Could not start the call.");
      const { default: Vapi } = await import("@vapi-ai/web");
      const v = new Vapi(init.publicKey) as unknown as VapiLike;
      vapi.current = v;
      v.on("call-start", () => { t0.current = Date.now(); setPhase("live"); });
      v.on("speech-start", () => setSpeaking(true));
      v.on("speech-end", () => setSpeaking(false));
      v.on("message", (m: { type?: string; role?: "user" | "assistant"; transcriptType?: string; transcript?: string }) => {
        if (m.type !== "transcript" || !m.transcript || !m.role) return;
        if (m.transcriptType === "final") addFinal(m.role, m.transcript); else setPartial(`${m.role === "user" ? "You" : candidate.name}: ${m.transcript}`);
      });
      v.on("error", () => { setError("The call had a problem. Check your microphone permission and try ending the interview."); });
      await v.start(init.assistantId);
    } catch (e) {
      setPhase("idle"); setError(e instanceof Error ? e.message : "Could not start the call.");
    }
  }

  async function finish() {
    setPhase("ending"); setError("");
    try { vapi.current?.stop(); } catch { /* already stopped */ }
    await new Promise((r) => setTimeout(r, 1500)); // let final transcripts and the provider webhook land
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ notes }) });
      if (segRef.current.length) await fetch(`/api/sessions/${sessionId}/voice/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ segments: segRef.current }) });
      const res = await fetch(`/api/sessions/${sessionId}/end`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ notes }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not build your report.");
      router.refresh();
    } catch (e) {
      setPhase("idle"); setError(e instanceof Error ? e.message : "Could not build your report.");
    }
  }

  const toggleMute = () => { vapi.current?.setMuted(!muted); setMuted(!muted); };
  const live = phase === "live";

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 text-sm">
        <div><p className="font-medium">{role}</p><p className="text-muted">{candidate.name}: {candidate.headline} · {archetype}, {difficulty}</p></div>
        <span className="tabular-nums text-muted" aria-label="Call time">{mmss(seconds)}</span>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <section aria-label="Live transcript" aria-live="polite" className={`${card} flex min-h-[22rem] flex-col p-4`}>
          <div className="flex items-center gap-3">
            <span className={`inline-block size-2.5 rounded-full ${live ? (speaking ? "bg-accent" : "bg-muted") : "bg-line"}`} aria-hidden />
            <p className="text-sm text-muted">{phase === "idle" ? "Not started" : phase === "connecting" ? "Connecting" : phase === "ending" ? "Building your report" : speaking ? `${candidate.name} is speaking` : "Your turn to ask"}</p>
          </div>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto text-sm">
            {segs.length === 0 && !partial && <p className="text-muted">{live ? "Say hello and ask your first question." : "Start the call, then speak as you would in a real interview. The transcript appears here."}</p>}
            {segs.map((g, i) => <p key={i} className={g.speaker === "interviewer" ? "text-right" : ""}><span className="text-xs text-muted">{g.speaker === "interviewer" ? "You" : candidate.name}</span><br />{g.content}</p>)}
            {partial && <p className="text-muted">{partial}</p>}
            <div ref={endRef} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4">
            {phase === "idle" && <button onClick={start} className={btnPrimary}><Mic className="size-4" aria-hidden />Start call</button>}
            {phase === "connecting" && <button disabled className={btnPrimary}><LoaderCircle className="size-4 animate-spin" aria-hidden />Connecting</button>}
            {live && <button onClick={toggleMute} className={btnGhost} aria-pressed={muted}>{muted ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}{muted ? "Unmute" : "Mute"}</button>}
            {(live || (phase === "idle" && segs.length > 0)) && <button onClick={finish} className={btnDanger}><PhoneOff className="size-4" aria-hidden />End interview</button>}
            {phase === "ending" && <button disabled className={btnGhost}><LoaderCircle className="size-4 animate-spin" aria-hidden />Working</button>}
          </div>
        </section>

        <aside>
          <label htmlFor="notes" className="text-sm font-medium">Private notes</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Record what was said or done, not impressions."
            className="mt-1 h-64 w-full resize-none rounded-md border border-line bg-surface p-3 text-sm" />
        </aside>
      </div>
      {error && <p role="alert" className="text-sm text-caution">{error}</p>}
      <p className="text-xs text-muted">The candidate is synthetic. Your microphone audio is processed by the voice provider; only the transcript is stored here.</p>
    </main>
  );
}
