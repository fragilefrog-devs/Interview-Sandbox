import { timingSafeEqual } from "node:crypto";
import type { VoiceEvent, VoiceInterviewProvider, VoiceSegment } from "../types";

const API = "https://api.vapi.ai";
const wordsOf = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

type VapiMsg = { role?: string; message?: string; secondsFromStart?: number; duration?: number };

/** Normalise Vapi's artifact.messages into our segments. Field names follow Vapi's server-event docs; verify against a real payload. */
export function toSegments(messages: VapiMsg[] | undefined): VoiceSegment[] {
  const out: VoiceSegment[] = [];
  for (const m of messages ?? []) {
    const speaker = m.role === "user" ? "interviewer" : m.role === "bot" || m.role === "assistant" ? "candidate" : null;
    const content = (m.message ?? "").trim();
    if (!speaker || !content) continue;
    const startMs = Math.max(0, Math.round((m.secondsFromStart ?? 0) * 1000));
    const dur = m.duration && m.duration > 0 ? m.duration : Math.round((wordsOf(content) / 2.5) * 1000); // ~150 wpm fallback
    out.push({ speaker, content: content.slice(0, 4000), startMs, endMs: startMs + dur });
  }
  return out;
}

export class VapiProvider implements VoiceInterviewProvider {
  readonly name = "vapi";
  get configured() { return !!(process.env.VAPI_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY && process.env.VAPI_WEBHOOK_SECRET); }

  private headers() { return { "content-type": "application/json", authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}` }; }

  async createSession({ sessionId, llmUrl, webhookUrl, webhookSecret }: Parameters<VoiceInterviewProvider["createSession"]>[0]) {
    const res = await fetch(`${API}/assistant`, {
      method: "POST", headers: this.headers(),
      body: JSON.stringify({
        name: `practice-${sessionId.slice(0, 8)}`,
        // The interviewer speaks first; the candidate waits.
        firstMessageMode: "assistant-waits-for-user",
        // Our server is the "LLM": the hidden dossier and disclosure ladder never leave it.
        model: { provider: "custom-llm", url: llmUrl, model: "practice-candidate", metadataSendMode: "off", timeoutSeconds: 30 },
        voice: { provider: "vapi", voiceId: process.env.VAPI_VOICE_ID || "Elliot" },
        transcriber: { provider: "deepgram", model: "nova-3", language: "en" },
        server: { url: webhookUrl, secret: webhookSecret },
        serverMessages: ["status-update", "end-of-call-report"],
        maxDurationSeconds: 1200,
        silenceTimeoutSeconds: 120,
        backgroundDenoisingEnabled: true,
        endCallFunctionEnabled: false,
      }),
    });
    if (!res.ok) throw new Error(`Vapi assistant create failed (${res.status})`);
    const data = await res.json();
    return { assistantId: String(data.id), publicKey: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY! };
  }

  async endSession(assistantId: string) {
    await fetch(`${API}/assistant/${encodeURIComponent(assistantId)}`, { method: "DELETE", headers: this.headers() }).catch(() => {});
  }

  verifyWebhook(req: Request) {
    const got = req.headers.get("x-vapi-secret") ?? "";
    const want = process.env.VAPI_WEBHOOK_SECRET ?? "";
    return !!want && safeEq(got, want);
  }

  parseWebhook(payload: unknown): VoiceEvent | null {
    const m = (payload as { message?: Record<string, any> } | null)?.message; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!m || typeof m.type !== "string") return null;
    const assistantId = m.call?.assistantId ?? m.assistant?.id;
    if (!assistantId) return null;
    const callId = m.call?.id;
    if (m.type === "status-update" && m.status === "in-progress") return { type: "started", assistantId, callId };
    if (m.type === "end-of-call-report") {
      return { type: "ended", assistantId, callId, reason: m.endedReason, segments: toSegments(m.artifact?.messages) };
    }
    return null;
  }
}
