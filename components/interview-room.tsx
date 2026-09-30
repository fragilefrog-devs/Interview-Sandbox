"use client";
import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, MessageSquare, NotebookPen, SendHorizontal, Square, Timer } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReportView } from "@/components/report-view";
import { useToast } from "@/components/toast";
import { btnGhost, btnPrimary } from "@/components/ui";
import { archetypeLabel, difficultyLabel, initials } from "@/lib/format";
import { MAX_INTERVIEWER_TURNS } from "@/lib/limits";
import type { Archetype, Difficulty, Message, Report } from "@/lib/schemas";

type Props = {
  sessionId: string; role: string; archetype: Archetype; difficulty: Difficulty; startedAt: string;
  candidate: { name: string; headline: string };
  initialMessages: Message[]; initialNotes: string;
};

const STARTERS = [
  "Walk me through a project you’re proud of.",
  "What did you personally decide on that project?",
  "What changed as a result of your work?",
];

export function InterviewRoom({ sessionId, role, archetype, difficulty, startedAt, candidate, initialMessages, initialNotes }: Props) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [notes, setNotes] = useState(initialNotes);
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved">("idle");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [panel, setPanel] = useState<"chat" | "notes">("chat");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const notesTouched = useRef(false);

  const asked = messages.filter((m) => m.speaker === "interviewer").length;
  const atLimit = asked >= MAX_INTERVIEWER_TURNS;

  useEffect(() => { // elapsed time survives reloads because it is derived from the session start
    if (report) return;
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [report, startedAt]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => { // debounced notes autosave
    if (!notesTouched.current) return;
    setNoteState("saving");
    const t = setTimeout(() => {
      fetch(`/api/sessions/${sessionId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ notes }) })
        .then((r) => setNoteState(r.ok ? "saved" : "idle")).catch(() => setNoteState("idle"));
    }, 800);
    return () => clearTimeout(t);
  }, [notes, sessionId]);

  useEffect(() => { // do not lose an in-flight answer or analysis to an accidental close
    if (!busy && !ending) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h);
  }, [busy, ending]);

  async function send() {
    const text = input.trim();
    if (!text || busy || atLimit) return;
    setInput(""); setError(""); setBusy(true); setPanel("chat");
    const next: Message[] = [...messages, { speaker: "interviewer", content: text }];
    setMessages([...next, { speaker: "candidate", content: "" }]);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/message`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error ?? "The candidate did not respond. Send your question again.");
      const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages([...next, { speaker: "candidate", content: acc }]);
      }
      if (!acc.trim()) throw new Error("The candidate did not respond. Send your question again.");
    } catch (e) {
      setMessages(messages); setInput(text);
      setError(e instanceof Error ? e.message : "The candidate did not respond. Send your question again.");
    } finally { setBusy(false); inputRef.current?.focus(); }
  }

  async function finish() {
    setConfirmEnd(false); setEnding(true); setError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/end`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ notes }) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Analysis failed. Try ending the interview again.");
      setReport(await res.json()); toast("Report ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Try ending the interview again.");
    } finally { setEnding(false); }
  }

  if (report) {
    return <ReportView report={report} candidateName={candidate.name} transcript={messages} notes={notes}
      meta={{ role, archetype, difficulty, turns: asked, durationMs: seconds * 1000 }} />;
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0"), ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-8">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent" aria-hidden>{initials(candidate.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{candidate.name}</p>
          <p className="truncate text-sm text-muted">{role}. {archetypeLabel[archetype]} candidate, {difficultyLabel[difficulty].toLowerCase()}.</p>
        </div>
        <span className="flex items-center gap-1.5 text-sm tabular-nums text-muted" aria-label="Elapsed time"><Timer className="size-4" aria-hidden />{mm}:{ss}</span>
        <span className="hidden text-sm tabular-nums text-muted sm:inline">{asked}/{MAX_INTERVIEWER_TURNS} questions</span>
        <button onClick={() => setConfirmEnd(true)} disabled={busy || ending || messages.length < 2} className={btnGhost}><Square className="size-3.5" aria-hidden />End interview</button>
      </div>

      <div role="tablist" aria-label="Interview panels" className="grid grid-cols-2 border-b border-line md:hidden">
        {([["chat", "Conversation", MessageSquare], ["notes", "Notes", NotebookPen]] as const).map(([id, label, Icon]) => (
          <button key={id} role="tab" aria-selected={panel === id} onClick={() => setPanel(id)}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium ${panel === id ? "border-b-2 border-accent text-accent" : "text-muted"}`}><Icon className="size-4" aria-hidden />{label}</button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_300px]">
        <section aria-label="Conversation" className={`${panel === "chat" ? "flex" : "hidden"} min-h-0 flex-col md:flex`}>
          <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-8">
            {messages.length === 0 && (
              <div className="mx-auto max-w-md py-6 text-center">
                <p className="font-serif text-xl">{candidate.name} is ready</p>
                <p className="mt-1 text-sm text-muted">{candidate.headline}. Ask your first question below.</p>
                <div className="mt-5 flex flex-col items-stretch gap-2">
                  <p className="text-xs text-muted">Ways to open</p>
                  {STARTERS.map((s) => <button key={s} type="button" onClick={() => { setInput(s); inputRef.current?.focus(); }} className="rounded-md border border-line bg-surface px-3 py-2 text-left text-sm hover:border-accent">{s}</button>)}
                </div>
              </div>
            )}
            {messages.map((m, i) => {
              const me = m.speaker === "interviewer";
              return (
                <div key={i} className={`flex gap-2.5 ${me ? "justify-end" : ""}`}>
                  {!me && <span className="mt-5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent" aria-hidden>{initials(candidate.name)}</span>}
                  <div className={`max-w-[85%] sm:max-w-[75%] ${me ? "text-right" : ""}`}>
                    <p className="text-xs text-muted">{me ? "You" : candidate.name}</p>
                    <div className={`mt-0.5 inline-block whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-left text-sm leading-relaxed ${me ? "bg-ink text-paper" : "border border-line bg-surface"}`}>
                      {m.content || <span className="typing text-muted" role="status" aria-label={`${candidate.name} is typing`}><span /><span /><span /></span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <div className="border-t border-line px-4 py-3 sm:px-8">
            {error && <p role="alert" className="pb-2 text-sm text-caution">{error}</p>}
            {atLimit && <p className="pb-2 text-sm text-muted">Question limit reached. End the interview to see your report.</p>}
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} rows={2} maxLength={2000} disabled={atLimit || ending}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                placeholder="Ask a question" aria-label="Your question" className="max-h-40 min-h-11 flex-1 resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm" />
              <button disabled={busy || ending || atLimit || !input.trim()} className={btnPrimary} aria-label="Send question">
                {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <SendHorizontal className="size-4" aria-hidden />}<span className="hidden sm:inline">Send</span>
              </button>
            </form>
            <p className="mt-1.5 hidden text-xs text-muted sm:block">Enter to send, Shift+Enter for a new line.</p>
          </div>
        </section>

        <aside aria-label="Notes" className={`${panel === "notes" ? "flex" : "hidden"} min-h-0 flex-col border-line p-4 md:flex md:border-l`}>
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium" htmlFor="notes">Private notes</label>
            <span className="flex items-center gap-1 text-xs text-muted" aria-live="polite">
              {noteState === "saving" && "Saving"}{noteState === "saved" && <><Check className="size-3" aria-hidden />Saved</>}
            </span>
          </div>
          <textarea id="notes" value={notes} onChange={(e) => { notesTouched.current = true; setNotes(e.target.value); }}
            placeholder="Record what was said or done, not impressions. For example: “Cut latency from 400ms to 180ms.”"
            className="mt-2 min-h-48 w-full flex-1 resize-none rounded-md border border-line bg-surface p-3 text-sm" />
          <p className="mt-2 text-xs text-muted">Notes are graded too. Evidence beats impressions.</p>
        </aside>
      </div>

      <ConfirmDialog open={confirmEnd} onClose={() => setConfirmEnd(false)} onConfirm={finish} confirmLabel="End and get report"
        title="End this interview?" description="You will not be able to ask more questions. Your report is generated from your questions and notes." />

      {ending && (
        <div role="status" className="fixed inset-0 z-[55] flex items-center justify-center bg-paper/80 backdrop-blur-sm">
          <div className="page-in mx-4 max-w-sm rounded-lg border border-line bg-surface p-6 text-center shadow-lg">
            <LoaderCircle className="mx-auto size-6 animate-spin text-accent" aria-hidden />
            <p className="mt-3 font-serif text-xl">Analysing your interview</p>
            <p className="mt-1 text-sm text-muted">Checking each question and note against the transcript. This can take up to a minute.</p>
          </div>
        </div>
      )}
    </div>
  );
}
