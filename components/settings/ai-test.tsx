"use client";
import { useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Plug } from "lucide-react";
import { btnGhost } from "@/components/ui";

export function AiTest({ live }: { live: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | { ok: boolean; message: string; ms?: number }>("idle");
  async function run() {
    setState("busy");
    const res = await fetch("/api/ai/test", { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setState(data ? { ok: !!data.ok, message: data.message ?? data.error ?? "No answer.", ms: data.ms } : { ok: false, message: "Could not reach the app server." });
  }
  return (
    <div>
      <button type="button" onClick={run} disabled={state === "busy"} className={btnGhost}>
        {state === "busy" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Plug className="size-4" aria-hidden />}Test connection
      </button>
      <div aria-live="polite" className="mt-3 min-h-5 text-sm">
        {typeof state === "object" && (
          <p className={`flex items-start gap-2 ${state.ok ? "text-accent" : "text-caution"}`}>
            {state.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
            <span>{state.message}{state.ms != null && state.ok ? ` (${state.ms} ms)` : ""}</span>
          </p>
        )}
        {state === "idle" && !live && <p className="text-muted">Add AI_API_KEY to your environment to turn on the live candidate.</p>}
      </div>
    </div>
  );
}
